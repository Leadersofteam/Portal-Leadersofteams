// Testy integracyjne Drabinki na realnym MySQL/Redis: oceny (publikacja
// symultaniczna i po oknie), naliczanie z wagami, idempotencja, dojrzewanie,
// awans i flip bramki minLevel, wzajemność → HOLD → moderacja.
import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAntifraudService } from '../antifraud/index';
import type { AntifraudService } from '../antifraud/index';
import { createOrdersService, createReviewsService } from '../marketplace/index';
import type { ReviewsService } from '../marketplace/index';
import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { createLadderService } from './service';
import type { LadderService, ReviewPublishedPayload } from './service';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();
const DAY = 86_400_000;

describe.skipIf(!hasInfra)('Drabinka — oceny, punkty, poziomy, antyfraud', () => {
  let ctx: AppContext;
  let ladder: LadderService;
  let reviewsService: ReviewsService;
  let antifraud: AntifraudService;
  let industryId: string;
  let companyCookie = '';
  let leaderCookie = '';
  let companyUserId = '';
  let leaderUserId = '';
  let companyId = '';

  const emails = {
    company: `drabinka-firma-${run}@example.com`,
    leader: `drabinka-lider-${run}@example.com`,
  };

  async function register(email: string, displayName: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    const raw = res.headers['set-cookie'];
    const cookie = String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '';
    return { cookie, userId: res.json().user.id as string };
  }

  async function post(
    cookie: string,
    url: string,
    payload?: Record<string, unknown>,
  ): Promise<LightMyRequestResponse> {
    return ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
  }

  // Pełny cykl życia zlecenia do CONFIRMED (przez HTTP — realne guardy).
  async function confirmedOrder(minLevel = 0): Promise<string> {
    const order = await post(companyCookie, '/api/v1/orders', {
      companyId,
      title: `Zlecenie drabinkowe ${run}-${Math.random().toString(36).slice(2, 8)}`,
      description: 'Zlecenie testowe do przepływu ocen i punktów w Drabince Lidera.',
      industryId,
      budgetMin: 1000,
      budgetMax: 2000,
      minLevel,
    });
    const orderId = order.json().id as string;
    expect((await post(companyCookie, `/api/v1/orders/${orderId}/publish`)).statusCode).toBe(200);
    const offer = await post(leaderCookie, `/api/v1/orders/${orderId}/offers`, {
      message: 'Wykonam to zlecenie zgodnie z opisem, doświadczenie w portfolio.',
    });
    expect(offer.statusCode).toBe(201);
    expect((await post(companyCookie, `/api/v1/offers/${offer.json().id}/accept`)).statusCode).toBe(
      200,
    );
    for (const [path, cookie] of [
      ['start', leaderCookie],
      ['deliver', leaderCookie],
      ['confirm', companyCookie],
    ] as const) {
      expect((await post(cookie, `/api/v1/orders/${orderId}/${path}`)).statusCode).toBe(200);
    }
    return orderId;
  }

  async function reviewPayloadFor(orderId: string): Promise<ReviewPublishedPayload> {
    const event = await ctx.prisma.outboxEvent.findFirst({
      where: {
        type: 'marketplace.review_published',
        payload: { path: '$.orderId', equals: orderId },
        AND: { payload: { path: '$.direction', equals: 'COMPANY_TO_LEADER' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(event).not.toBeNull();
    return event!.payload as unknown as ReviewPublishedPayload;
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    ladder = createLadderService(ctx.prisma);
    const identity = (await import('../identity/index')).createIdentityService(ctx.prisma);
    reviewsService = createReviewsService({ prisma: ctx.prisma, identity });
    const orders = createOrdersService({ prisma: ctx.prisma, identity, ladder });
    antifraud = createAntifraudService({ prisma: ctx.prisma, ladder, marketplace: orders });

    const industry = await ctx.prisma.industry.upsert({
      where: { slug: `drabinka-${run}` },
      update: {},
      create: { name: `Drabinka test ${run}`, slug: `drabinka-${run}` },
    });
    industryId = industry.id;

    ({ cookie: companyCookie, userId: companyUserId } = await register(
      emails.company,
      'Firma Drabinkowa',
    ));
    ({ cookie: leaderCookie, userId: leaderUserId } = await register(
      emails.leader,
      'Lider Drabinkowy',
    ));

    const company = await post(companyCookie, '/api/v1/companies', { name: 'Drabinka Sp. z o.o.' });
    companyId = company.json().company.id;
    // Dojrzała firma (>14 dni) ⇒ waga dojrzałości 1.0 w testach bazowych.
    await ctx.prisma.company.update({
      where: { id: companyId },
      data: { createdAt: new Date(Date.now() - 30 * DAY) },
    });

    await post(leaderCookie, '/api/v1/me/leader-profile', {
      industryId,
      headline: 'Lider testujący Drabinkę punktową',
    });
  }, 120_000);

  afterAll(async () => {
    if (ctx) {
      const userIds = [companyUserId, leaderUserId];
      await ctx.prisma.order.deleteMany({ where: { industryId } });
      await ctx.prisma.pointEvent.deleteMany({ where: { userId: { in: userIds } } });
      await ctx.prisma.ladderState.deleteMany({ where: { userId: { in: userIds } } });
      await ctx.prisma.levelAchievement.deleteMany({ where: { userId: { in: userIds } } });
      await ctx.prisma.moderationCase.deleteMany({ where: { subjectUserId: { in: userIds } } });
      await ctx.prisma.fraudSignal.deleteMany({ where: { userId: { in: userIds } } });
      await ctx.prisma.leaderProfile.deleteMany({ where: { userId: { in: userIds } } });
      await ctx.prisma.company.deleteMany({
        where: { members: { some: { userId: { in: userIds } } } },
      });
      await ctx.prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
      await ctx.prisma.industry.deleteMany({ where: { slug: `drabinka-${run}` } });
      await ctx.close();
    }
  });

  let firstOrderId = '';

  it('publikacja symultaniczna: pierwsza ocena czeka, druga publikuje obie', async () => {
    firstOrderId = await confirmedOrder();

    const leaderReview = await post(leaderCookie, `/api/v1/orders/${firstOrderId}/reviews`, {
      rating: 5,
      comment: 'Świetna współpraca z firmą.',
    });
    expect(leaderReview.statusCode).toBe(201);
    expect(leaderReview.json().published).toBe(false);

    // Przed publikacją nikt nie widzi ocen (anty-odwet).
    const before = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/orders/${firstOrderId}/reviews`,
      headers: { cookie: companyCookie },
    });
    expect(before.json().reviews).toHaveLength(0);

    const companyReview = await post(companyCookie, `/api/v1/orders/${firstOrderId}/reviews`, {
      rating: 5,
      comment: 'Perfekcyjna realizacja.',
    });
    expect(companyReview.statusCode).toBe(201);
    expect(companyReview.json().published).toBe(true);

    const after = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/orders/${firstOrderId}/reviews`,
    });
    expect(after.json().reviews).toHaveLength(2);

    const dup = await post(companyCookie, `/api/v1/orders/${firstOrderId}/reviews`, { rating: 4 });
    expect(dup.statusCode).toBe(409);
  });

  it('naliczenie: ocena 5/5 od dojrzałej firmy = 100 pkt PENDING; idempotentnie', async () => {
    const payload = await reviewPayloadFor(firstOrderId);
    const event = await ladder.handleReviewPublished(payload);
    expect(event?.points).toBe(100);
    expect(event?.status).toBe('PENDING');

    // Redelivery zdarzenia nie duplikuje punktów (unikat w ledgerze).
    expect(await ladder.handleReviewPublished(payload)).toBeNull();
    const count = await ctx.prisma.pointEvent.count({ where: { userId: leaderUserId } });
    expect(count).toBe(1);

    // PENDING nie liczy się do poziomu (okno karencji).
    expect(await ladder.getLevel(leaderUserId)).toBe(0);
  });

  it('dojrzewanie: po karencji punkty CONFIRMED → poziom 1 → LevelAchievement + zdarzenie', async () => {
    const matured = await ladder.maturePendingPoints(new Date(Date.now() + 8 * DAY));
    expect(matured).toBeGreaterThan(0);
    expect(await ladder.getLevel(leaderUserId)).toBe(1);

    const achievement = await ctx.prisma.levelAchievement.findUnique({
      where: { userId_level: { userId: leaderUserId, level: 1 } },
    });
    expect(achievement).not.toBeNull();

    const levelEvent = await ctx.prisma.outboxEvent.findFirst({
      where: { type: 'ladder.level_achieved', payload: { path: '$.userId', equals: leaderUserId } },
    });
    expect(levelEvent).not.toBeNull();

    const my = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/ladder',
      headers: { cookie: leaderCookie },
    });
    expect(my.json().state.level).toBe(1);
    expect(my.json().state.isLeader).toBe(true);
    expect(my.json().nextLevel.level).toBe(2);
    expect(my.json().events[0].meta.explanation).toContain('Ocena 5/5');
  });

  it('flip bramki minLevel: Lider z poziomem 1 może ofertować zlecenie minLevel=1', async () => {
    const order = await post(companyCookie, '/api/v1/orders', {
      companyId,
      title: `Zlecenie premium ${run}`,
      description: 'Dostępne od poziomu 1 — test flipa bramki zaufania stopniowanego.',
      industryId,
      budgetMin: 10000,
      budgetMax: 20000,
      minLevel: 1,
    });
    const orderId = order.json().id;
    await post(companyCookie, `/api/v1/orders/${orderId}/publish`);
    const offer = await post(leaderCookie, `/api/v1/orders/${orderId}/offers`, {
      message: 'Mam już poziom 1 — bramka powinna mnie przepuścić.',
    });
    expect(offer.statusCode).toBe(201);
  });

  it('malejące zwroty: drugie ocenione zlecenie tej samej pary daje 50 pkt', async () => {
    const orderId = await confirmedOrder();
    await post(leaderCookie, `/api/v1/orders/${orderId}/reviews`, { rating: 5 });
    await post(companyCookie, `/api/v1/orders/${orderId}/reviews`, { rating: 5 });
    const event = await ladder.handleReviewPublished(await reviewPayloadFor(orderId));
    expect(event?.points).toBe(50);
    expect(event?.weightApplied).toBe(0.5);
    expect((event?.meta as { repeatCount: number }).repeatCount).toBe(1);
  });

  it('publikacja po oknie: jednostronna ocena publikuje się po 14 dniach', async () => {
    const orderId = await confirmedOrder();
    await post(companyCookie, `/api/v1/orders/${orderId}/reviews`, { rating: 4 });

    const before = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}/reviews`,
    });
    expect(before.json().reviews).toHaveLength(0);

    const published = await reviewsService.publishDueReviews(new Date(Date.now() + 15 * DAY));
    expect(published).toBeGreaterThan(0);

    const after = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}/reviews`,
    });
    expect(after.json().reviews).toHaveLength(1);
  });

  it('wzajemność: firma Lidera zleca firmie oceniającej → punkt HOLD + sprawa', async () => {
    // Lider zakłada firmę, a właściciel firmy oceniającej zostaje Liderem
    // i dostaje od niej zlecenie — klasyczny układ wzajemnego podbijania.
    const leaderCompany = await post(leaderCookie, '/api/v1/companies', {
      name: 'Firma Lidera (wzajemność)',
    });
    const leaderCompanyId = leaderCompany.json().company.id;
    await post(companyCookie, '/api/v1/me/leader-profile', {
      industryId,
      headline: 'Właściciel firmy działający też jako Lider',
    });
    const reverseOrder = await post(leaderCookie, '/api/v1/orders', {
      companyId: leaderCompanyId,
      title: `Zlecenie zwrotne ${run}`,
      description: 'Zlecenie od firmy Lidera dla właściciela firmy oceniającej.',
      industryId,
      budgetMin: 500,
      budgetMax: 800,
      minLevel: 0,
    });
    const reverseOrderId = reverseOrder.json().id;
    await post(leaderCookie, `/api/v1/orders/${reverseOrderId}/publish`);
    const reverseOffer = await post(companyCookie, `/api/v1/orders/${reverseOrderId}/offers`, {
      message: 'Przyjmę to zlecenie zwrotne — domykamy pętlę wzajemności.',
    });
    expect(reverseOffer.statusCode).toBe(201);
    await post(leaderCookie, `/api/v1/offers/${reverseOffer.json().id}/accept`);

    // Trzecie ocenione zlecenie firma→lider: punkt powinien zostać wstrzymany.
    const orderId = await confirmedOrder();
    await post(leaderCookie, `/api/v1/orders/${orderId}/reviews`, { rating: 5 });
    await post(companyCookie, `/api/v1/orders/${orderId}/reviews`, { rating: 5 });
    const event = await ladder.handleReviewPublished(await reviewPayloadFor(orderId));
    expect(event).not.toBeNull();

    const moderationCase = await antifraud.evaluatePendingPoint({
      pointEventId: event!.id,
      userId: leaderUserId,
      counterpartyId: companyId,
      orderId,
    });
    expect(moderationCase).not.toBeNull();

    const held = await ctx.prisma.pointEvent.findUnique({ where: { id: event!.id } });
    expect(held?.status).toBe('HOLD');
  });

  it('moderacja: RBAC + REJECT trwale cofa wstrzymany punkt', async () => {
    // Zwykły użytkownik nie widzi spraw.
    const forbidden = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/moderation/cases',
      headers: { cookie: leaderCookie },
    });
    expect(forbidden.statusCode).toBe(403);

    // Awans na moderatora (operacja administracyjna).
    await ctx.prisma.user.update({
      where: { id: companyUserId },
      data: { role: 'MODERATOR' },
    });
    const { cookie: modCookie } = await (async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: emails.company, password: 'super-tajne-haslo-1' },
      });
      const raw = res.headers['set-cookie'];
      return { cookie: String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '' };
    })();

    const cases = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/moderation/cases',
      headers: { cookie: modCookie },
    });
    expect(cases.statusCode).toBe(200);
    const openCase = cases
      .json()
      .cases.find((c: { pointEventId: string | null }) => c.pointEventId);
    expect(openCase).toBeDefined();

    const resolve = await post(modCookie, `/api/v1/moderation/cases/${openCase.id}/resolve`, {
      action: 'REJECT',
      note: 'Potwierdzona wzajemność zleceń — punkty cofnięte.',
    });
    expect(resolve.statusCode).toBe(200);

    const reversed = await ctx.prisma.pointEvent.findUnique({
      where: { id: openCase.pointEventId },
    });
    expect(reversed?.status).toBe('REVERSED');

    const resolved = await ctx.prisma.moderationCase.findUnique({ where: { id: openCase.id } });
    expect(resolved?.status).toBe('RESOLVED');
    expect(resolved?.resolution).toBe('REJECT');
  });

  it('profil publiczny Lidera pokazuje realny poziom i średnią ocen', async () => {
    const profile = await ctx.prisma.leaderProfile.findUnique({
      where: { userId: leaderUserId },
    });
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/leaders/${profile!.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().profile.level).toBe(1);
    expect(res.json().profile.reviewCount).toBeGreaterThanOrEqual(2);
    expect(res.json().profile.averageRating).toBeGreaterThanOrEqual(4);
  });
});

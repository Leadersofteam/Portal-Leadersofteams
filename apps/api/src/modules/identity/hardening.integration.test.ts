// Testy integracyjne hardeningu Sprintu 6 na realnym MySQL/Redis:
// cache-aside (D3), RODO/anonimizacja + eksport (D6), przycisk „zgłoś" (D7),
// e-mail za flagą — weryfikacja/reset przy wysyłce wyłączonej (D4).
import { createHash } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('Sprint 6 — hardening (cache, RODO, zgłoś, e-mail za flagą)', () => {
  let ctx: AppContext;
  let industryId = '';
  let companyId = '';
  let companyCookie = '';
  let companyUserId = '';

  const emails = {
    company: `hard-firma-${run}@example.com`,
    victim: `hard-user-${run}@example.com`,
    reporter: `hard-report-${run}@example.com`,
  };

  const createdUserIds: string[] = [];

  async function register(email: string, displayName: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    const raw = res.headers['set-cookie'];
    const userId = res.json().user.id as string;
    createdUserIds.push(userId);
    return {
      cookie: String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '',
      userId,
    };
  }

  function post(cookie: string, url: string, payload?: Record<string, unknown>) {
    return ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const industry = await ctx.prisma.industry.upsert({
      where: { slug: `hard-${run}` },
      update: {},
      create: { name: `Hard test ${run}`, slug: `hard-${run}` },
    });
    industryId = industry.id;
    ({ cookie: companyCookie, userId: companyUserId } = await register(emails.company, 'Firma H'));
    const company = await post(companyCookie, '/api/v1/companies', { name: 'Hard Sp. z o.o.' });
    companyId = company.json().company.id;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    const uid = { in: createdUserIds };
    // Sprzątanie po ID (anonimizacja zmienia e-mail — filtrowanie po e-mailu
    // nie objęłoby usuniętego konta i blokowałoby usunięcie branży przez FK).
    await ctx.prisma.moderationCase.deleteMany({ where: { reportedByUserId: uid } });
    await ctx.prisma.order.deleteMany({ where: { industryId } });
    await ctx.prisma.pointEvent.deleteMany({ where: { userId: uid } });
    await ctx.prisma.answerVote.deleteMany({ where: { userId: uid } });
    await ctx.prisma.answer.deleteMany({ where: { authorUserId: uid } });
    await ctx.prisma.thread.deleteMany({ where: { authorUserId: uid } });
    await ctx.prisma.post.deleteMany({ where: { authorUserId: uid } });
    await ctx.prisma.group.deleteMany({ where: { name: `Hard grupa ${run}` } });
    await ctx.prisma.leaderProfile.deleteMany({ where: { userId: uid } });
    await ctx.prisma.verificationToken.deleteMany({ where: { userId: uid } });
    await ctx.prisma.company.deleteMany({ where: { id: companyId } });
    await ctx.prisma.user.deleteMany({ where: { id: uid } });
    await ctx.prisma.industry.deleteMany({ where: { slug: `hard-${run}` } });
    await ctx.close();
  });

  async function publishOrder(title: string): Promise<string> {
    const order = await post(companyCookie, '/api/v1/orders', {
      companyId,
      title,
      description: 'Zlecenie testowe do walidacji cache-aside listingu publicznego.',
      industryId,
      budgetMin: 1000,
      budgetMax: 2000,
      minLevel: 0,
    });
    const orderId = order.json().id as string;
    await post(companyCookie, `/api/v1/orders/${orderId}/publish`);
    return orderId;
  }

  it('cache-aside listingu zleceń: serwuje z cache i inwaliduje przy publikacji', async () => {
    const first = await publishOrder(`Cache A ${run}`);
    // GET listing → wypełnia cache; potem klucz wersji istnieje.
    const list1 = await ctx.app.inject({ method: 'GET', url: '/api/v1/orders' });
    expect(list1.json().orders.some((o: { id: string }) => o.id === first)).toBe(true);
    const cacheKeys = await ctx.redis.keys('cache:orders:*');
    expect(cacheKeys.length).toBeGreaterThan(0);

    // Wstaw opublikowane zlecenie BEZPOŚREDNIO (bez bump) → listing wciąż z cache
    // (nowe zlecenie niewidoczne) — dowód, że odpowiedź pochodzi z cache.
    const hidden = await ctx.prisma.order.create({
      data: {
        companyId,
        createdById: companyUserId,
        industryId,
        title: `Cache HIDDEN ${run}`,
        description: 'Wstawione poza serwisem — nie powinno unieważnić cache.',
        budgetMin: 1,
        budgetMax: 2,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    const list2 = await ctx.app.inject({ method: 'GET', url: '/api/v1/orders' });
    expect(list2.json().orders.some((o: { id: string }) => o.id === hidden.id)).toBe(false);

    // Publikacja przez serwis bumpuje wersję → cache unieważniony → świeży odczyt
    // pokazuje i ukryte, i nowe zlecenie.
    const third = await publishOrder(`Cache C ${run}`);
    const list3 = await ctx.app.inject({ method: 'GET', url: '/api/v1/orders' });
    const ids = list3.json().orders.map((o: { id: string }) => o.id);
    expect(ids).toContain(hidden.id);
    expect(ids).toContain(third);
  });

  it('/me/ladder nigdy nie trafia do cache', async () => {
    const me = await register(`hard-ladder-${run}@example.com`, 'Ladder H');
    await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/ladder',
      headers: { cookie: me.cookie },
    });
    const ladderKeys = await ctx.redis.keys('cache:*');
    expect(ladderKeys.some((k) => k.includes('ladder') || k.includes('me_'))).toBe(false);
    await ctx.prisma.user.deleteMany({ where: { email: `hard-ladder-${run}@example.com` } });
  });

  it('RODO: DELETE /me anonimizuje konto, ZACHOWUJE ledger i unieważnia sesję', async () => {
    const victim = await register(emails.victim, 'Ofiara RODO');
    // Treści + wpis punktowy (ledger) użytkownika.
    const victimProfile = await ctx.prisma.leaderProfile.create({
      data: { userId: victim.userId, industryId, headline: 'Mój prawdziwy nagłówek', bio: 'Bio' },
    });
    const group = await ctx.prisma.group.create({
      data: {
        name: `Hard grupa ${run}`,
        type: 'OPEN',
        memberships: { create: { userId: victim.userId, role: 'MEMBER', status: 'ACTIVE' } },
      },
    });
    const post1 = await ctx.prisma.post.create({
      data: { groupId: group.id, authorUserId: victim.userId, title: 'Tytuł', body: 'Moja treść' },
    });
    const thread = await ctx.prisma.thread.create({
      data: { groupId: group.id, authorUserId: victim.userId, title: 'Pytanie', body: 'Treść pyt' },
    });
    const ledger = await ctx.prisma.pointEvent.create({
      data: {
        userId: victim.userId,
        type: 'ORDER_COMPLETED_RATED',
        points: 100,
        weightApplied: 1,
        meta: {},
        sourceType: 'Seed',
        sourceId: `seed-${run}-rodo`,
        status: 'CONFIRMED',
        rulesetVersion: 'v1',
      },
    });

    // Prywatne półki: ulubiona usługa i zakładka. MUSZĄ realnie powstać —
    // asercja „po usunięciu jest zero" na pustym zbiorze przechodzi przez
    // POMINIĘCIE i nie sprawdza niczego (ta mina wystąpiła w tym repo).
    const listing = await ctx.prisma.serviceListing.create({
      data: {
        leaderProfileId: victimProfile.id,
        industryId,
        title: `Usługa RODO ${run}`,
        slug: `usluga-rodo-${run}`,
        description: 'Opis usługi na potrzeby testu RODO',
        status: 'PUBLISHED',
      },
    });
    await ctx.prisma.listingFavorite.create({
      data: { userId: victim.userId, listingId: listing.id },
    });
    await ctx.prisma.bookmark.create({
      data: { userId: victim.userId, subjectType: 'POST', subjectId: post1.id },
    });
    expect(await ctx.prisma.listingFavorite.count({ where: { userId: victim.userId } })).toBe(1);
    expect(await ctx.prisma.bookmark.count({ where: { userId: victim.userId } })).toBe(1);

    // Eksport zwraca dane ze wszystkich modułów.
    const exp = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/export',
      headers: { cookie: victim.cookie },
    });
    expect(exp.statusCode).toBe(200);
    expect(exp.json().user.email).toBe(emails.victim);
    expect(exp.json().posts.length).toBeGreaterThan(0);
    expect(exp.json().threads.length).toBeGreaterThan(0);

    // Usunięcie = anonimizacja.
    const del = await ctx.app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: { cookie: victim.cookie },
    });
    expect(del.statusCode).toBe(200);

    const user = await ctx.prisma.user.findUnique({ where: { id: victim.userId } });
    expect(user?.email).toMatch(/^deleted-/);
    expect(user?.displayName).toBe('Użytkownik usunięty');
    expect(user?.anonymizedAt).not.toBeNull();

    // Ledger nietknięty (integralność Drabinki, ADR-004).
    const keptLedger = await ctx.prisma.pointEvent.findUnique({ where: { id: ledger.id } });
    expect(keptLedger?.points).toBe(100);

    // Treści zanonimizowane.
    const profile = await ctx.prisma.leaderProfile.findUnique({ where: { userId: victim.userId } });
    expect(profile?.isVisible).toBe(false);
    expect(profile?.headline).toBe('Profil usunięty');
    expect((await ctx.prisma.post.findUnique({ where: { id: post1.id } }))?.body).toBe(
      '[treść usunięta]',
    );
    expect((await ctx.prisma.thread.findUnique({ where: { id: thread.id } }))?.body).toBe(
      '[treść usunięta]',
    );

    // Prywatne półki znikają w całości — `/panel/konto` obiecuje to wprost,
    // a obietnica prawna musi mieć pokrycie w kodzie, nie w copy (S18).
    expect(await ctx.prisma.listingFavorite.count({ where: { userId: victim.userId } })).toBe(0);
    expect(await ctx.prisma.bookmark.count({ where: { userId: victim.userId } })).toBe(0);

    // Sesja unieważniona — stary cookie już nie działa.
    const me = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: victim.cookie },
    });
    expect(me.statusCode).toBe(401);
  });

  it('zgłoś: POST /reports tworzy ModerationCase źródło REPORT z soft-dedup', async () => {
    const reporter = await register(emails.reporter, 'Zgłaszający');
    // Zgłaszamy realny post (subjectId musi być cuid encji).
    const group = await ctx.prisma.group.create({
      data: { name: `Hard grupa ${run}`, type: 'OPEN' },
    });
    const reported = await ctx.prisma.post.create({
      data: { groupId: group.id, authorUserId: companyUserId, title: 'Spam', body: 'Zgłaszalne' },
    });
    const subjectId = reported.id;
    const first = await post(reporter.cookie, '/api/v1/reports', {
      subjectType: 'POST',
      subjectId,
      reason: 'Spam / treść niezgodna z regulaminem',
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().duplicate).toBe(false);

    const mc = await ctx.prisma.moderationCase.findFirst({
      where: { source: 'REPORT', subjectId, reportedByUserId: reporter.userId },
    });
    expect(mc).not.toBeNull();

    // Ponowne zgłoszenie tej samej pary → duplikat (bez mnożenia spraw).
    const second = await post(reporter.cookie, '/api/v1/reports', {
      subjectType: 'POST',
      subjectId,
      reason: 'Znowu spam',
    });
    expect(second.json().duplicate).toBe(true);
  });

  it('e-mail za flagą (OFF): reset hasła przez devToken; weryfikacja adresu tokenem', async () => {
    // Reset hasła: wysyłka wyłączona → token zwracany jako devToken (nie-prod).
    const reqReset = await post(companyCookie, '/api/v1/auth/request-password-reset', {
      email: emails.company,
    });
    expect(reqReset.json().ok).toBe(true);
    const devToken = reqReset.json().devToken as string;
    expect(devToken).toBeTruthy();

    const reset = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: devToken, password: 'nowe-super-haslo-2' },
    });
    expect(reset.statusCode).toBe(200);
    // Logowanie nowym hasłem działa.
    const login = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emails.company, password: 'nowe-super-haslo-2' },
    });
    expect(login.statusCode).toBe(200);

    // Weryfikacja adresu: podstawiamy token (hash w DB) i potwierdzamy.
    const rawVerify = `verify-${run}-token-abc`;
    await ctx.prisma.verificationToken.create({
      data: {
        userId: companyUserId,
        type: 'EMAIL_VERIFY',
        tokenHash: createHash('sha256').update(rawVerify).digest('hex'),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    const ok = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { token: rawVerify },
    });
    expect(ok.json().verified).toBe(true);
    expect(
      (await ctx.prisma.user.findUnique({ where: { id: companyUserId } }))?.emailVerifiedAt,
    ).not.toBeNull();

    // Zły token → brak weryfikacji.
    const bad = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { token: 'nieistniejacy-token-xyz' },
    });
    expect(bad.json().verified).toBe(false);
  });
});

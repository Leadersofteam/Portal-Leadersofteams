// Testy integracyjne modułu notifications na realnym MySQL/Redis: konsumpcja
// realnych zdarzeń domenowych (marketplace.*, groups.*) → wpisy Notification u
// właściwych odbiorców, idempotencja (dedupeKey), licznik nieprzeczytanych,
// oznaczanie jako przeczytane. Konsumenci wołani wprost (jak w testach ladder).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createIdentityService } from '../identity/index';
import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { createNotificationsService } from './service';
import type { NotificationsService } from './service';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('notifications — konsumpcja zdarzeń, idempotencja, licznik', () => {
  let ctx: AppContext;
  let notifications: NotificationsService;
  let companyCookie = '';
  let leaderCookie = '';
  let companyUserId = '';
  let leaderUserId = '';
  let companyId = '';
  let industryId = '';
  let offerSubmittedPayload: Record<string, unknown> = {};
  let offerAcceptedPayload: Record<string, unknown> = {};

  const emails = {
    company: `notif-firma-${run}@example.com`,
    leader: `notif-lider-${run}@example.com`,
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

  function post(cookie: string, url: string, payload?: Record<string, unknown>) {
    return ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
  }

  async function outboxPayload(type: string, orderId: string) {
    const event = await ctx.prisma.outboxEvent.findFirst({
      where: { type, payload: { path: '$.orderId', equals: orderId } },
      orderBy: { createdAt: 'desc' },
    });
    expect(event).not.toBeNull();
    return event!.payload as Record<string, unknown>;
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const identity = createIdentityService(ctx.prisma);
    // Bez sygnału realtime (domyślny no-op) — testujemy ścieżkę danych.
    notifications = createNotificationsService({ prisma: ctx.prisma, identity });

    const industry = await ctx.prisma.industry.upsert({
      where: { slug: `notif-${run}` },
      update: {},
      create: { name: `Notif test ${run}`, slug: `notif-${run}` },
    });
    industryId = industry.id;

    ({ cookie: companyCookie, userId: companyUserId } = await register(
      emails.company,
      'Firma Notif',
    ));
    ({ cookie: leaderCookie, userId: leaderUserId } = await register(emails.leader, 'Lider Notif'));

    const company = await post(companyCookie, '/api/v1/companies', { name: 'Notif Sp. z o.o.' });
    companyId = company.json().company.id;
    await post(leaderCookie, '/api/v1/me/leader-profile', {
      industryId,
      headline: 'Lider testujący powiadomienia',
    });

    // Realny przepływ: zlecenie → oferta → akceptacja (zdarzenia w outboxie).
    const order = await post(companyCookie, '/api/v1/orders', {
      companyId,
      title: `Zlecenie powiadomieniowe ${run}`,
      description: 'Zlecenie do testu fan-outu powiadomień z realnych zdarzeń.',
      industryId,
      budgetMin: 1000,
      budgetMax: 2000,
      minLevel: 0,
    });
    const orderId = order.json().id as string;
    await post(companyCookie, `/api/v1/orders/${orderId}/publish`);
    const offer = await post(leaderCookie, `/api/v1/orders/${orderId}/offers`, {
      message: 'Chętnie zrealizuję to zlecenie — powiadomcie firmę o mojej ofercie.',
    });
    await post(companyCookie, `/api/v1/offers/${offer.json().id}/accept`);

    offerSubmittedPayload = await outboxPayload('marketplace.offer_submitted', orderId);
    offerAcceptedPayload = await outboxPayload('marketplace.offer_accepted', orderId);
  }, 120_000);

  afterAll(async () => {
    if (ctx) {
      const userIds = [companyUserId, leaderUserId];
      await ctx.prisma.order.deleteMany({ where: { industryId } });
      await ctx.prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await ctx.prisma.leaderProfile.deleteMany({ where: { userId: { in: userIds } } });
      await ctx.prisma.company.deleteMany({ where: { id: companyId } });
      await ctx.prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
      await ctx.prisma.industry.deleteMany({ where: { slug: `notif-${run}` } });
      await ctx.close();
    }
  });

  it('offer_submitted → powiadomienie dla firmy; offer_accepted → dla Lidera', async () => {
    await notifications.onOfferSubmitted(offerSubmittedPayload as never);
    await notifications.onOfferAccepted(offerAcceptedPayload as never);

    const companyUnread = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/notifications/unread-count',
      headers: { cookie: companyCookie },
    });
    expect(companyUnread.json().count).toBe(1);

    const leaderUnread = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/notifications/unread-count',
      headers: { cookie: leaderCookie },
    });
    expect(leaderUnread.json().count).toBe(1);

    const companyList = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/notifications',
      headers: { cookie: companyCookie },
    });
    expect(companyList.json().notifications[0].type).toBe('offer_submitted');
  });

  it('redelivery tego samego zdarzenia NIE duplikuje powiadomienia (dedupeKey)', async () => {
    await notifications.onOfferSubmitted(offerSubmittedPayload as never);
    await notifications.onOfferAccepted(offerAcceptedPayload as never);

    const count = await ctx.prisma.notification.count({ where: { userId: companyUserId } });
    expect(count).toBe(1);
  });

  it('groups.comment_added: autor posta dostaje powiadomienie; komentarz do siebie — nie', async () => {
    await notifications.onCommentAdded({
      commentId: `c-${run}`,
      postId: `p-${run}`,
      groupId: `g-${run}`,
      postAuthorUserId: leaderUserId,
      actorUserId: companyUserId,
    } as never);
    // Komentarz autora do własnego posta nie powiadamia.
    await notifications.onCommentAdded({
      commentId: `c2-${run}`,
      postId: `p-${run}`,
      groupId: `g-${run}`,
      postAuthorUserId: leaderUserId,
      actorUserId: leaderUserId,
    } as never);

    const leaderNotifs = await ctx.prisma.notification.findMany({
      where: { userId: leaderUserId, type: 'post_commented' },
    });
    expect(leaderNotifs).toHaveLength(1);
  });

  it('ladder.level_achieved → powiadomienie o awansie dla użytkownika', async () => {
    await notifications.onLevelAchieved({
      achievementId: `ach-${run}`,
      userId: companyUserId,
      level: 3,
    } as never);
    const notif = await ctx.prisma.notification.findFirst({
      where: { userId: companyUserId, type: 'level_achieved' },
    });
    expect(notif).not.toBeNull();
    expect((notif!.payload as { level: number }).level).toBe(3);
  });

  it('oznaczenie wszystkich jako przeczytane zeruje licznik', async () => {
    const read = await post(leaderCookie, '/api/v1/me/notifications/read', { all: true });
    expect(read.statusCode).toBe(200);
    expect(read.json().updated).toBeGreaterThan(0);

    const unread = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/notifications/unread-count',
      headers: { cookie: leaderCookie },
    });
    expect(unread.json().count).toBe(0);
  });
});

// Wątek przy ofercie (PL1) na realnym MySQL/Redis: obie strony piszą, osoba
// trzecia nie widzi, zamknięta oferta zamyka rozmowę, zdarzenie idzie do
// outboxa z adresatem. Powód: do 04.09 Firma mogła ofertę tylko przyjąć albo
// zignorować — pierwsza realna oferta Portalu wisiała bez pytania i odpowiedzi.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('marketplace — wątek przy ofercie', () => {
  let ctx: AppContext;
  let industryId = '';
  let companyCookie = '';
  let leaderCookie = '';
  let strangerCookie = '';
  let companyId = '';
  let orderId = '';
  let offerId = '';

  const emails = {
    company: `watek-firma-${run}@example.com`,
    leader: `watek-lider-${run}@example.com`,
    stranger: `watek-obcy-${run}@example.com`,
  };

  async function register(email: string, displayName: string): Promise<string> {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    expect(res.statusCode).toBe(201);
    const raw = res.headers['set-cookie'];
    return String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '';
  }

  function post(cookie: string, url: string, payload?: Record<string, unknown>) {
    return ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
  }
  function get(cookie: string, url: string) {
    return ctx.app.inject({ method: 'GET', url, headers: { cookie } });
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const industry = await ctx.prisma.industry.upsert({
      where: { slug: `watek-${run}` },
      update: {},
      create: { name: `Wątek test ${run}`, slug: `watek-${run}` },
    });
    industryId = industry.id;
    companyCookie = await register(emails.company, 'Firma Wątek');
    leaderCookie = await register(emails.leader, 'Lider Wątek');
    strangerCookie = await register(emails.stranger, 'Obcy Wątek');

    const company = await post(companyCookie, '/api/v1/companies', { name: 'Wątek Sp. z o.o.' });
    companyId = company.json().company.id;
    await post(leaderCookie, '/api/v1/me/leader-profile', {
      industryId,
      headline: 'Lider testujący wątek oferty',
    });
    const order = await post(companyCookie, '/api/v1/orders', {
      companyId,
      title: `Zlecenie z wątkiem ${run}`,
      description: 'Zlecenie do testu rozmowy przy ofercie — obie strony mają mieć głos.',
      industryId,
      budgetMin: 1000,
      budgetMax: 3000,
      minLevel: 0,
    });
    orderId = order.json().id;
    await post(companyCookie, `/api/v1/orders/${orderId}/publish`);
    const offer = await post(leaderCookie, `/api/v1/orders/${orderId}/offers`, {
      message: 'Zrobię to w dwa tygodnie, mam podobne wdrożenia za sobą.',
      proposedBudget: 2000,
    });
    expect(offer.statusCode).toBe(201);
    offerId = offer.json().id;
  }, 120_000);

  afterAll(async () => {
    if (ctx) {
      await ctx.prisma.order.deleteMany({ where: { industryId } });
      await ctx.prisma.leaderProfile.deleteMany({
        where: { user: { email: { in: Object.values(emails) } } },
      });
      await ctx.prisma.notification.deleteMany({
        where: { user: { email: { in: Object.values(emails) } } },
      });
      if (companyId) await ctx.prisma.company.deleteMany({ where: { id: companyId } });
      await ctx.prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
      await ctx.prisma.industry.deleteMany({ where: { slug: `watek-${run}` } });
      await ctx.close();
    }
  });

  it('świeży wątek: obie strony widzą ofertę, pusto, można odpowiadać', async () => {
    const company = await get(companyCookie, `/api/v1/offers/${offerId}/messages`);
    expect(company.statusCode).toBe(200);
    expect(company.json().thread.viewer).toEqual({ isLeader: false, isCompany: true });
    expect(company.json().thread.canReply).toBe(true);
    expect(company.json().thread.messages).toEqual([]);
    expect(company.json().thread.offer.proposedBudget).toBe(2000);

    const leader = await get(leaderCookie, `/api/v1/offers/${offerId}/messages`);
    expect(leader.json().thread.viewer).toEqual({ isLeader: true, isCompany: false });
  });

  it('osoba trzecia nie widzi wątku i nie może pisać', async () => {
    const read = await get(strangerCookie, `/api/v1/offers/${offerId}/messages`);
    expect(read.statusCode).toBe(403);
    const write = await post(strangerCookie, `/api/v1/offers/${offerId}/messages`, {
      body: 'Ja też chcę!',
    });
    expect(write.statusCode).toBe(403);
    const anon = await ctx.app.inject({ method: 'GET', url: `/api/v1/offers/${offerId}/messages` });
    expect(anon.statusCode).toBe(401);
  });

  it('Firma pyta, Lider odpowiada — wątek w kolejności, z autorem i isOwn', async () => {
    const q = await post(companyCookie, `/api/v1/offers/${offerId}/messages`, {
      body: 'Czy w cenie jest wdrożenie na produkcję?',
    });
    expect(q.statusCode).toBe(201);
    const a = await post(leaderCookie, `/api/v1/offers/${offerId}/messages`, {
      body: 'Tak, wdrożenie i tydzień wsparcia po starcie.',
    });
    expect(a.statusCode).toBe(201);

    const thread = (await get(leaderCookie, `/api/v1/offers/${offerId}/messages`)).json().thread;
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages[0].authorName).toBe('Firma Wątek');
    expect(thread.messages[0].isOwn).toBe(false);
    expect(thread.messages[1].isOwn).toBe(true);

    // Licznik wiadomości na liście ofert Firmy i w „Moich ofertach" Lidera.
    const offers = (await get(companyCookie, `/api/v1/orders/${orderId}/offers`)).json().offers;
    expect(offers[0].messagesCount).toBe(2);
    const mine = (await get(leaderCookie, '/api/v1/me/offers')).json().offers;
    expect(mine.find((o: { id: string }) => o.id === offerId).messagesCount).toBe(2);
  });

  it('zdarzenie offer_message trafia do outboxa z adresatem po drugiej stronie', async () => {
    const events = await ctx.prisma.outboxEvent.findMany({
      where: { type: 'marketplace.offer_message', payload: { path: '$.offerId', equals: offerId } },
      orderBy: { createdAt: 'asc' },
    });
    expect(events).toHaveLength(2);
    const first = events[0]!.payload as Record<string, unknown>;
    expect(first.authorIsLeader).toBe(false);
    expect(first.companyId).toBe(companyId);
    expect(first.orderTitle).toBe(`Zlecenie z wątkiem ${run}`);
    const second = events[1]!.payload as Record<string, unknown>;
    expect(second.authorIsLeader).toBe(true);
  });

  it('pusta wiadomość jest odrzucana', async () => {
    const res = await post(leaderCookie, `/api/v1/offers/${offerId}/messages`, { body: '   ' });
    expect(res.statusCode).toBe(400);
  });

  it('wycofana oferta zamyka rozmowę do odczytu', async () => {
    await post(leaderCookie, `/api/v1/offers/${offerId}/withdraw`);
    const thread = (await get(companyCookie, `/api/v1/offers/${offerId}/messages`)).json().thread;
    expect(thread.canReply).toBe(false);
    expect(thread.messages).toHaveLength(2);
    const write = await post(companyCookie, `/api/v1/offers/${offerId}/messages`, {
      body: 'Halo?',
    });
    expect(write.statusCode).toBe(409);
  });
});

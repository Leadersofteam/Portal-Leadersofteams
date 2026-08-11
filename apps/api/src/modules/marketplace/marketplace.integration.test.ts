// Testy integracyjne marketplace na realnym MySQL/Redis: pełny cykl życia
// zlecenia, bramka minLevel, konflikt interesów, autoryzacja, outbox.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('marketplace — cykl życia zlecenia end-to-end', () => {
  let ctx: AppContext;
  let industryId: string;
  let companyCookie = '';
  let leaderCookie = '';
  let noProfileCookie = '';
  let companyId = '';
  let orderId = '';
  let gatedOrderId = '';
  let offerId = '';
  let leaderProfileId = '';

  const emails = {
    company: `firma-${run}@example.com`,
    leader: `lider-${run}@example.com`,
    noProfile: `bezprofilu-${run}@example.com`,
  };

  async function register(email: string, displayName: string): Promise<string> {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    expect(res.statusCode).toBe(201);
    const setCookie = res.headers['set-cookie'];
    const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    return String(raw).split(';')[0] ?? '';
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const industry = await ctx.prisma.industry.upsert({
      where: { slug: `test-${run}` },
      update: {},
      create: { name: `Branża testowa ${run}`, slug: `test-${run}` },
    });
    industryId = industry.id;
    companyCookie = await register(emails.company, 'Właściciel Firmy');
    leaderCookie = await register(emails.leader, 'Lider Testowy');
    noProfileCookie = await register(emails.noProfile, 'Bez Profilu');
  });

  afterAll(async () => {
    if (ctx) {
      // Kolejność zgodna z kluczami obcymi: zlecenia (kaskadują oferty) →
      // profile (kaskadują portfolio) → firmy (kaskadują członkostwa) → userzy.
      await ctx.prisma.order.deleteMany({ where: { industryId } });
      await ctx.prisma.leaderProfile.deleteMany({
        where: { user: { email: { in: Object.values(emails) } } },
      });
      if (companyId) await ctx.prisma.company.deleteMany({ where: { id: companyId } });
      await ctx.prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
      await ctx.prisma.industry.deleteMany({ where: { slug: `test-${run}` } });
      await ctx.close();
    }
  });

  it('firma: utworzenie firmy i szkicu zlecenia', async () => {
    const company = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      headers: { cookie: companyCookie },
      payload: { name: 'Zleceniodawca Sp. z o.o.' },
    });
    expect(company.statusCode).toBe(201);
    companyId = company.json().company.id;

    const order = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { cookie: companyCookie },
      payload: {
        companyId,
        title: `Wdrożenie automatyzacji CRM ${run}`,
        description: 'Szukamy Lidera, który wdroży automatyzację procesów sprzedażowych w CRM.',
        industryId,
        budgetMin: 5000,
        budgetMax: 12000,
        minLevel: 0,
      },
    });
    expect(order.statusCode).toBe(201);
    expect(order.json().status).toBe('DRAFT');
    orderId = order.json().id;
  });

  it('szkic nie jest widoczny publicznie, po publikacji jest', async () => {
    const anonBefore = await ctx.app.inject({ method: 'GET', url: `/api/v1/orders/${orderId}` });
    expect(anonBefore.statusCode).toBe(404);

    const publish = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/publish`,
      headers: { cookie: companyCookie },
    });
    expect(publish.statusCode).toBe(200);

    const anonAfter = await ctx.app.inject({ method: 'GET', url: `/api/v1/orders/${orderId}` });
    expect(anonAfter.statusCode).toBe(200);
    expect(anonAfter.json().order.status).toBe('PUBLISHED');
    expect(anonAfter.json().order.companyName).toBe('Zleceniodawca Sp. z o.o.');
  });

  it('obcy użytkownik nie może publikować ani anulować cudzego zlecenia (403)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/cancel`,
      headers: { cookie: leaderCookie },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('NOT_COMPANY_MEMBER');
  });

  it('listing publiczny: filtry + wyszukiwarka FULLTEXT', async () => {
    const list = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/orders?industryId=${industryId}`,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().orders.some((o: { id: string }) => o.id === orderId)).toBe(true);

    const search = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/orders?q=${encodeURIComponent('automatyzacji CRM')}`,
    });
    expect(search.statusCode).toBe(200);
    expect(search.json().orders.some((o: { id: string }) => o.id === orderId)).toBe(true);

    const miss = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/orders?q=${encodeURIComponent('xyzzyniematakiego')}`,
    });
    expect(miss.json().orders).toHaveLength(0);
  });

  it('oferta bez profilu Lidera → 400 PROFILE_REQUIRED', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/offers`,
      headers: { cookie: noProfileCookie },
      payload: { message: 'Chętnie podejmę się tego zlecenia, mam doświadczenie.' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('PROFILE_REQUIRED');
  });

  it('lider: utworzenie profilu z portfolio', async () => {
    const profile = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/leader-profile',
      headers: { cookie: leaderCookie },
      payload: {
        industryId,
        headline: 'Lider automatyzacji procesów sprzedażowych',
        bio: 'Od 8 lat wdrażam CRM-y i automatyzacje.',
      },
    });
    expect(profile.statusCode).toBe(201);
    leaderProfileId = profile.json().id;

    const item = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/leader-profile/portfolio',
      headers: { cookie: leaderCookie },
      payload: { title: 'Wdrożenie CRM dla 200 handlowców', url: 'https://example.com/case' },
    });
    expect(item.statusCode).toBe(201);

    const publicProfile = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/leaders/${leaderProfileId}`,
    });
    expect(publicProfile.statusCode).toBe(200);
    expect(publicProfile.json().profile.displayName).toBe('Lider Testowy');
    expect(publicProfile.json().profile.portfolioItems).toHaveLength(1);
  });

  it('publiczny katalog /leaders: widoczne profile z dołączonym poziomem i oceną + filtry', async () => {
    const list = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/leaders?industryId=${industryId}`,
    });
    expect(list.statusCode).toBe(200);
    const found = list.json().leaders.find((l: { id: string }) => l.id === leaderProfileId);
    expect(found).toBeTruthy();
    expect(found.displayName).toBe('Lider Testowy');
    expect(found.level).toBe(0); // brak punktów jeszcze
    expect(found.reviewCount).toBe(0);
    expect(found.industry.slug).toBeTruthy();

    // filtr frazą po nagłówku (LIKE)
    const search = await ctx.app.inject({ method: 'GET', url: `/api/v1/leaders?q=automatyzacji` });
    expect(search.json().leaders.some((l: { id: string }) => l.id === leaderProfileId)).toBe(true);

    // fraza bez trafień
    const miss = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/leaders?q=nieistniejacafraza999`,
    });
    expect(miss.json().leaders.some((l: { id: string }) => l.id === leaderProfileId)).toBe(false);
  });

  it('bramka minLevel: zlecenie z minLevel=1 odrzuca Lidera z poziomem 0', async () => {
    const gated = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { cookie: companyCookie },
      payload: {
        companyId,
        title: `Duży projekt strategiczny ${run}`,
        description: 'Projekt dostępny wyłącznie dla doświadczonych Liderów z poziomem.',
        industryId,
        budgetMin: 50000,
        budgetMax: 90000,
        minLevel: 1,
      },
    });
    gatedOrderId = gated.json().id;
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${gatedOrderId}/publish`,
      headers: { cookie: companyCookie },
    });

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${gatedOrderId}/offers`,
      headers: { cookie: leaderCookie },
      payload: { message: 'Bardzo chętnie, ale nie mam jeszcze poziomu do tego zlecenia.' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('LEVEL_TOO_LOW');
  });

  it('członek firmy nie może ofertować własnego zlecenia (konflikt interesów)', async () => {
    await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/leader-profile',
      headers: { cookie: companyCookie },
      payload: { industryId, headline: 'Właściciel firmy będący też Liderem' },
    });
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/offers`,
      headers: { cookie: companyCookie },
      payload: { message: 'Spróbuję zaofertować zlecenie własnej firmy — to test guardu.' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('OWN_COMPANY');
  });

  it('lider składa ofertę; duplikat → 409', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/offers`,
      headers: { cookie: leaderCookie },
      payload: {
        message: 'Wdrożę automatyzację w 3 tygodnie, referencje w portfolio.',
        proposedBudget: 9000,
        proposedDays: 21,
      },
    });
    expect(res.statusCode).toBe(201);
    offerId = res.json().id;

    const dup = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/offers`,
      headers: { cookie: leaderCookie },
      payload: { message: 'Druga oferta do tego samego zlecenia nie powinna przejść.' },
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('OFFER_EXISTS');
  });

  it('oferty widzi tylko firma; akceptacja przenosi zlecenie do AWARDED', async () => {
    const forbidden = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}/offers`,
      headers: { cookie: leaderCookie },
    });
    expect(forbidden.statusCode).toBe(403);

    const offers = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}/offers`,
      headers: { cookie: companyCookie },
    });
    expect(offers.statusCode).toBe(200);
    expect(offers.json().offers).toHaveLength(1);
    expect(offers.json().offers[0].leader.displayName).toBe('Lider Testowy');

    const accept = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/offers/${offerId}/accept`,
      headers: { cookie: companyCookie },
    });
    expect(accept.statusCode).toBe(200);

    const order = await ctx.app.inject({ method: 'GET', url: `/api/v1/orders/${orderId}` });
    expect(order.json().order.status).toBe('AWARDED');
  });

  it('realizacja: start → deliver → confirm (z kontrolą ról i przejść)', async () => {
    // Firma nie może wystartować pracy za Lidera.
    const wrongActor = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/start`,
      headers: { cookie: companyCookie },
    });
    expect(wrongActor.statusCode).toBe(403);

    // Potwierdzenie przed dostarczeniem = złe przejście.
    const tooEarly = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/confirm`,
      headers: { cookie: companyCookie },
    });
    expect(tooEarly.statusCode).toBe(409);

    for (const [path, cookie] of [
      ['start', leaderCookie],
      ['deliver', leaderCookie],
      ['confirm', companyCookie],
    ] as const) {
      const res = await ctx.app.inject({
        method: 'POST',
        url: `/api/v1/orders/${orderId}/${path}`,
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
    }

    const order = await ctx.app.inject({ method: 'GET', url: `/api/v1/orders/${orderId}` });
    expect(order.json().order.status).toBe('CONFIRMED');
  });

  it('outbox zawiera pełny ślad zdarzeń domenowych cyklu życia', async () => {
    const events = await ctx.prisma.outboxEvent.findMany({
      where: { payload: { path: '$.orderId', equals: orderId } },
      select: { type: true },
    });
    const types = events.map((e) => e.type);
    for (const expected of [
      'marketplace.order_published',
      'marketplace.offer_submitted',
      'marketplace.offer_accepted',
      'marketplace.order_started',
      'marketplace.order_delivered',
      'marketplace.order_confirmed',
    ]) {
      expect(types).toContain(expected);
    }
  });

  it('panel: moje oferty i zlecenia mojej firmy', async () => {
    const myOffers = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/offers',
      headers: { cookie: leaderCookie },
    });
    expect(myOffers.json().offers.some((o: { id: string }) => o.id === offerId)).toBe(true);

    const myOrders = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/orders',
      headers: { cookie: companyCookie },
    });
    const mine = myOrders.json().orders;
    expect(mine.some((o: { id: string }) => o.id === orderId)).toBe(true);
    expect(mine.some((o: { id: string }) => o.id === gatedOrderId)).toBe(true);
  });
});

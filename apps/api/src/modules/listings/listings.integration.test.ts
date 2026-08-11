// Ścieżka Usług (Fiverr-lite): publikacja → katalog/filtry → ulubione →
// zapytanie → wątek → konwersja w Order. Twarda asercja anty-MLM: żaden krok
// przed recenzją nie tworzy PointEvent.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('listings — usługi, zapytania, konwersja', () => {
  let ctx: AppContext;
  let leaderCookie = '';
  let companyCookie = '';
  let leaderUserId = '';
  let companyId = '';
  let industryId = '';
  let listingId = '';
  let listingSlug = '';
  let inquiryId = '';
  const emails = [`lider-uslugi-${run}@test.local`, `firma-uslugi-${run}@test.local`];

  async function register(email: string, displayName: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    expect(res.statusCode).toBe(201);
    return {
      cookie: res.headers['set-cookie'] as string,
      userId: (res.json() as { user: { id: string } }).user.id,
    };
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));

    const leader = await register(emails[0]!, 'Lider Usługowy');
    leaderCookie = leader.cookie;
    leaderUserId = leader.userId;
    const company = await register(emails[1]!, 'Firma Pytająca');
    companyCookie = company.cookie;

    const industries = await ctx.app.inject({ method: 'GET', url: '/api/v1/industries' });
    industryId = (industries.json() as { industries: Array<{ id: string }> }).industries[0]!.id;

    const profile = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/leader-profile',
      headers: { cookie: leaderCookie },
      payload: { industryId, headline: 'Automatyzuję procesy sprzedaży', isVisible: true },
    });
    expect(profile.statusCode).toBe(201);

    const companyRes = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      headers: { cookie: companyCookie },
      payload: { name: `Firma Testowa ${run}` },
    });
    expect(companyRes.statusCode).toBe(201);
    companyId = (companyRes.json() as { company: { id: string } }).company.id;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    const users = await ctx.prisma.user.findMany({ where: { email: { in: emails } } });
    const ids = users.map((u) => u.id);
    await ctx.prisma.pointEvent.deleteMany({ where: { userId: { in: ids } } });
    await ctx.prisma.serviceListing.deleteMany({
      where: { leaderProfile: { userId: { in: ids } } },
    });
    await ctx.prisma.order.deleteMany({ where: { companyId } });
    await ctx.prisma.company.deleteMany({ where: { id: companyId } });
    await ctx.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await ctx.close();
  });

  it('Lider tworzy i publikuje usługę z pakietami i tagami', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/listings',
      headers: { cookie: leaderCookie },
      payload: {
        industryId,
        title: `Automatyzacja lejka sprzedaży ${run}`,
        description:
          'Zbuduję i wdrożę automatyzację lejka sprzedażowego end-to-end: od scoringu leadów po sekwencje follow-up.',
        tags: ['automatyzacja', 'CRM'],
        packages: [
          { tier: 'BASIC', name: 'Audyt', priceDeclared: 1500, scope: 'Audyt lejka + raport z rekomendacjami', deliveryDays: 7 },
          { tier: 'PREMIUM', name: 'Wdrożenie', priceDeclared: 9000, scope: 'Pełne wdrożenie automatyzacji z testami', deliveryDays: 30 },
        ],
        imageFileIds: [],
      },
    });
    expect(created.statusCode).toBe(201);
    const body = created.json() as { id: string; slug: string };
    listingId = body.id;
    listingSlug = body.slug;

    const published = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/listings/${listingId}/publish`,
      headers: { cookie: leaderCookie },
    });
    expect(published.statusCode).toBe(200);
  });

  it('katalog zwraca usługę z metadanymi Lidera; filtry cen działają', async () => {
    const list = await ctx.app.inject({ method: 'GET', url: '/api/v1/listings?sort=price_asc' });
    expect(list.statusCode).toBe(200);
    const found = (list.json() as { listings: Array<{ id: string; priceFrom: number; leader: { displayName: string; level: number } }> }).listings.find(
      (l) => l.id === listingId,
    );
    expect(found).toBeDefined();
    expect(found!.priceFrom).toBe(1500);
    expect(found!.leader.displayName).toBe('Lider Usługowy');

    const filtered = await ctx.app.inject({ method: 'GET', url: '/api/v1/listings?priceMax=1000' });
    expect(
      (filtered.json() as { listings: Array<{ id: string }> }).listings.some((l) => l.id === listingId),
    ).toBe(false);

    const detail = await ctx.app.inject({ method: 'GET', url: `/api/v1/listings/slug/${listingSlug}` });
    expect(detail.statusCode).toBe(200);
    const packages = (detail.json() as { listing: { packages: Array<{ tier: string }> } }).listing.packages;
    expect(packages.map((p) => p.tier)).toEqual(['BASIC', 'PREMIUM']);
  });

  it('ulubione: dodanie i lista', async () => {
    const fav = await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/listings/${listingId}/favorite`,
      headers: { cookie: companyCookie },
    });
    expect(fav.statusCode).toBe(200);
    const favs = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/favorites',
      headers: { cookie: companyCookie },
    });
    expect(
      (favs.json() as { listings: Array<{ id: string }> }).listings.some((l) => l.id === listingId),
    ).toBe(true);
  });

  it('Firma wysyła zapytanie, Lider odpowiada, Firma konwertuje w zlecenie', async () => {
    const inquiry = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/listings/${listingId}/inquiries`,
      headers: { cookie: companyCookie },
      payload: {
        companyId,
        message: 'Interesuje nas audyt lejka — jak szybko możecie zacząć?',
        packageTier: 'BASIC',
      },
    });
    expect(inquiry.statusCode).toBe(201);
    inquiryId = (inquiry.json() as { id: string }).id;

    const reply = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/inquiries/${inquiryId}/messages`,
      headers: { cookie: leaderCookie },
      payload: { body: 'Start możliwy od przyszłego tygodnia.' },
    });
    expect(reply.statusCode).toBe(201);

    const thread = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/inquiries/${inquiryId}`,
      headers: { cookie: companyCookie },
    });
    const messages = (thread.json() as { inquiry: { messages: Array<{ body: string }> } }).inquiry.messages;
    expect(messages).toHaveLength(2);

    const converted = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/inquiries/${inquiryId}/convert`,
      headers: { cookie: companyCookie },
    });
    expect(converted.statusCode).toBe(201);
    const { orderId } = converted.json() as { orderId: string };

    const order = await ctx.prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('DRAFT');
    expect(order?.budgetMin).toBe(1500);
    expect(order?.budgetMax).toBe(9000);

    const after = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/inquiries/${inquiryId}`,
      headers: { cookie: leaderCookie },
    });
    expect((after.json() as { inquiry: { status: string } }).inquiry.status).toBe('CONVERTED');
  });

  it('ANTY-MLM: publikacja usługi, zapytanie i konwersja NIE tworzą żadnego PointEvent', async () => {
    const events = await ctx.prisma.pointEvent.count({ where: { userId: leaderUserId } });
    expect(events).toBe(0);
  });

  it('nie można wysłać zapytania do własnej usługi', async () => {
    const own = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/listings/${listingId}/inquiries`,
      headers: { cookie: leaderCookie },
      payload: { companyId, message: 'Próba zapytania samego siebie — nie powinna przejść.' },
    });
    expect([400, 403]).toContain(own.statusCode);
  });
});

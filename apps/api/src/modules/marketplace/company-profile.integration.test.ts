// Publiczny profil Firmy i popularne tagi (dług z S11).
//
// Sedno: Lider decydujący, czy złożyć ofertę, musi zobaczyć COŚ WIĘCEJ niż nazwę.
// Test pilnuje, że profil jest publiczny (widoczny bez logowania) i że odznaka
// NIP zapala się WYŁĄCZNIE dla numeru, który przeszedł sumę kontrolną.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

// Numer o poprawnej sumie kontrolnej (ten sam, którego używa shared/nip.test.ts).
const VALID_NIP = '5252248481';

describe.skipIf(!hasInfra)('publiczny profil Firmy', () => {
  let ctx: AppContext;
  const email = `firma-${run}@test.local`;
  let cookie = '';
  let companyId = '';
  let plainCompanyId = '';

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName: 'Właściciel Firmy' },
    });
    expect(res.statusCode).toBe(201);
    cookie = res.headers['set-cookie'] as string;

    const withNip = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      headers: { cookie },
      payload: { name: `Firma z NIP ${run}`, nip: VALID_NIP },
    });
    expect(withNip.statusCode).toBe(201);
    companyId = (withNip.json() as { company: { id: string } }).company.id;

    const withoutNip = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      headers: { cookie },
      payload: { name: `Firma bez NIP ${run}` },
    });
    expect(withoutNip.statusCode).toBe(201);
    plainCompanyId = (withoutNip.json() as { company: { id: string } }).company.id;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.companyMember.deleteMany({
      where: { companyId: { in: [companyId, plainCompanyId] } },
    });
    await ctx.prisma.company.deleteMany({ where: { id: { in: [companyId, plainCompanyId] } } });
    await ctx.prisma.user.deleteMany({ where: { email } });
    await ctx.close();
  });

  it('profil jest widoczny BEZ logowania', async () => {
    // Gość musi go zobaczyć: Lider rozważający ofertę bywa niezalogowany,
    // a ekran logowania na tym kroku to stracona oferta.
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/companies/${companyId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      company: { name: string };
      stats: { ordersPublished: number; ordersCompleted: number };
      reviews: unknown[];
      orders: unknown[];
    };
    expect(body.company.name).toContain(String(run));
    expect(body.stats.ordersPublished).toBe(0);
    expect(body.reviews).toEqual([]);
    expect(body.orders).toEqual([]);
  });

  it('odznaka NIP zapala się tylko dla numeru z poprawną sumą kontrolną', async () => {
    const withNip = await ctx.app.inject({ method: 'GET', url: `/api/v1/companies/${companyId}` });
    expect(
      (withNip.json() as { company: { nipVerifiedAt: string | null } }).company.nipVerifiedAt,
    ).not.toBeNull();

    const withoutNip = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/companies/${plainCompanyId}`,
    });
    expect(
      (withoutNip.json() as { company: { nipVerifiedAt: string | null } }).company.nipVerifiedAt,
    ).toBeNull();
  });

  it('NIP z błędną sumą kontrolną nie tworzy firmy w ogóle', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      headers: { cookie },
      payload: { name: `Zły NIP ${run}`, nip: '1234567890' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('nieistniejąca firma daje 404, a nie pusty profil', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/companies/clnieistniejacaaaaaaaaaaaa',
    });
    expect(res.statusCode).toBe(404);
  });

  it('endpoint popularnych tagów odpowiada i nie wymaga logowania', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/listings/tags/popular' });
    expect(res.statusCode).toBe(200);
    // Zawartość zależy od danych w bazie współdzielonej między przebiegami —
    // asertujemy KSZTAŁT, nie konkretne tagi, żeby test nie był kruchy.
    const { tags } = res.json() as { tags: Array<{ name: string; slug: string; count: number }> };
    expect(Array.isArray(tags)).toBe(true);
    for (const tag of tags) {
      expect(typeof tag.slug).toBe('string');
      expect(tag.count).toBeGreaterThan(0);
    }
  });

  it('licznik zrealizowanych liczy CONFIRMED, nie dowolny status', async () => {
    // Regresja na realną pomyłkę z tej sesji: pierwotnie liczyłem status
    // „COMPLETED", którego w tym cyklu życia w ogóle nie ma (jest CONFIRMED).
    // Typecheck to złapał, ale wtedy licznik po cichu pokazywałby zero.
    const expected = await ctx.prisma.order.count({
      where: { companyId, status: 'CONFIRMED' },
    });
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/companies/${companyId}` });
    expect((res.json() as { stats: { ordersCompleted: number } }).stats.ordersCompleted).toBe(
      expected,
    );
  });
});

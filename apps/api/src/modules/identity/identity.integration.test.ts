// Test integracyjny pełnego przepływu identity na realnym MySQL i Redis.
// Wymaga DATABASE_URL i REDIS_URL (lokalnie: infra/docker-compose.dev.yml,
// w CI: kontenery serwisowe) oraz wykonanego `prisma db push`.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);

describe.skipIf(!hasInfra)('identity — przepływ end-to-end', () => {
  let ctx: AppContext;
  const email = `test-${Date.now()}@example.com`;
  const password = 'super-tajne-haslo-1';
  let sessionCookie = '';

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.prisma.user.deleteMany({ where: { email } });
      await ctx.close();
    }
  });

  it('rejestruje nowego użytkownika i zakłada sesję', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password, displayName: 'Tester Integracyjny' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().user.email).toBe(email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('odrzuca ponowną rejestrację na ten sam e-mail (409)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password, displayName: 'Duplikat' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('EMAIL_TAKEN');
  });

  it('odrzuca logowanie z błędnym hasłem (401)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'zle-haslo-123' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('loguje poprawnymi danymi i zwraca sesję', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    const setCookie = res.headers['set-cookie'];
    const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(raw).toBeDefined();
    sessionCookie = String(raw).split(';')[0] ?? '';
  });

  it('GET /auth/me zwraca zalogowanego użytkownika', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(email);
  });

  it('tworzy firmę i zapisuje zdarzenie outbox atomowo', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      headers: { cookie: sessionCookie },
      // NIP musi mieć poprawną sumę kontrolną (S11) — „1234567890" jej nie ma.
      payload: { name: 'Testowa Sp. z o.o.', nip: '5252248481' },
    });
    expect(res.statusCode).toBe(201);
    const companyId = res.json().company.id;

    const outbox = await ctx.prisma.outboxEvent.findFirst({
      where: { type: 'identity.company_created' },
      orderBy: { createdAt: 'desc' },
    });
    expect(outbox).not.toBeNull();
    expect(outbox?.payload).toMatchObject({ companyId });
  });

  it('odrzuca NIP o błędnej sumie kontrolnej (walidacja offline, 0 zł)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      headers: { cookie: sessionCookie },
      payload: { name: 'Firma z literówką w NIP', nip: '5252248482' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('wymaga zalogowania do utworzenia firmy (401)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      payload: { name: 'Bez sesji' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('wylogowanie unieważnia sesję', async () => {
    const out = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie: sessionCookie },
    });
    expect(out.statusCode).toBe(200);

    const me = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: sessionCookie },
    });
    expect(me.statusCode).toBe(401);
  });

  it('/healthz raportuje zdrowe zależności', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', checks: { mysql: 'ok', redis: 'ok' } });
  });
});

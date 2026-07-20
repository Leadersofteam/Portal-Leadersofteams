// Egzekucja Turnstile w /auth/register przy WŁĄCZONEJ ochronie (sekret ustawiony).
// Cloudflare siteverify zamockowane: token 'good' → success, inne → odrzucone.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('Turnstile — egzekucja w rejestracji (ochrona ON)', () => {
  let ctx: AppContext;
  const emails: string[] = [];

  beforeAll(async () => {
    ctx = await buildServer(
      loadConfig({
        ...process.env,
        NODE_ENV: 'test',
        LOG_LEVEL: 'error',
        TURNSTILE_SECRET_KEY: 'test-secret',
      }),
    );
  }, 120_000);

  afterEach(() => vi.restoreAllMocks());

  afterAll(async () => {
    if (!ctx) return;
    if (emails.length) await ctx.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await ctx.close();
  });

  function mockSiteverify() {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const body = String((init as RequestInit | undefined)?.body ?? '');
      const success = body.includes('response=good');
      return new Response(JSON.stringify({ success }), { status: 200 });
    });
  }

  function register(email: string, turnstileToken?: string) {
    return ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName: 'Bot Test', turnstileToken },
    });
  }

  it('brak tokenu → 400 (bez wołania siteverify)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await register(`ts-none-${run}@example.com`);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('TURNSTILE_FAILED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('token odrzucony przez CF → 400, konto NIE powstaje', async () => {
    mockSiteverify();
    const email = `ts-bad-${run}@example.com`;
    const res = await register(email, 'zly-token');
    expect(res.statusCode).toBe(400);
    expect(await ctx.prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('token ważny → 201, konto powstaje', async () => {
    mockSiteverify();
    const email = `ts-good-${run}@example.com`;
    emails.push(email);
    const res = await register(email, 'good');
    expect(res.statusCode).toBe(201);
    expect(res.json().user.email).toBe(email);
  });
});

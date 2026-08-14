// Pierwsza mila (S10): stan kreatora i checklisty.
//
// Najważniejszy przypadek jest na końcu: przejście CAŁEGO kreatora nie może
// wyprodukować ani jednego zdarzenia domenowego ani punktu. Onboarding to mapa,
// nie nagroda — i ma to być prawda strukturalna, nie obietnica w regulaminie.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('onboarding — pierwsza mila', () => {
  let ctx: AppContext;
  const email = `onboarding-${run}@test.local`;
  let cookie = '';
  let userId = '';

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName: 'Kreator Testowy' },
    });
    expect(res.statusCode).toBe(201);
    cookie = res.headers['set-cookie'] as string;
    userId = (res.json() as { user: { id: string } }).user.id;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.user.deleteMany({ where: { email } });
    await ctx.close();
  });

  it('świeże konto startuje na kroku 0, bez intencji i bez ukończenia', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/onboarding',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ step: 0, intent: null, completedAt: null });
  });

  it('gość nie ma dostępu do stanu kreatora', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/me/onboarding' });
    expect(res.statusCode).toBe(401);
  });

  it('zapisuje intencję i krok, odrzuca intencję spoza słownika', async () => {
    const ok = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/v1/me/onboarding',
      headers: { cookie },
      payload: { intent: 'LEADER', step: 2 },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ intent: 'LEADER', step: 2 });

    const bad = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/v1/me/onboarding',
      headers: { cookie },
      payload: { intent: 'INWESTOR' },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('ukończenie jest idempotentne — znacznik nie przesuwa się przy powtórce', async () => {
    const first = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/v1/me/onboarding',
      headers: { cookie },
      payload: { completed: true },
    });
    const completedAt = (first.json() as { completedAt: string }).completedAt;
    expect(completedAt).toBeTruthy();

    const second = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/v1/me/onboarding',
      headers: { cookie },
      payload: { completed: true },
    });
    expect((second.json() as { completedAt: string }).completedAt).toBe(completedAt);
  });

  it('ANTY-MLM: cały kreator nie emituje zdarzeń i nie daje ani jednego punktu', async () => {
    const startedAt = new Date();

    for (const payload of [
      { intent: 'COMPANY' as const },
      { step: 2 },
      { step: 3 },
      { completed: true },
      { dismissChecklist: true },
    ]) {
      const res = await ctx.app.inject({
        method: 'PATCH',
        url: '/api/v1/me/onboarding',
        headers: { cookie },
        payload,
      });
      expect(res.statusCode).toBe(200);
    }

    // Zero zdarzeń w outboxie = zero dróg do laddera. To jest cały mechanizm.
    expect(await ctx.prisma.outboxEvent.count({ where: { createdAt: { gte: startedAt } } })).toBe(
      0,
    );
    expect(await ctx.prisma.pointEvent.count({ where: { userId } })).toBe(0);
    const state = await ctx.prisma.ladderState.findUnique({ where: { userId } });
    expect(state?.totalPoints ?? 0).toBe(0);
  });
});

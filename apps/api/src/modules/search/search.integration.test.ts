// Wyszukiwarka globalna: jedno pole, wyniki z pięciu modułów.
//
// Najważniejszy przypadek: trafienie na PREFIKS („rekrut" → „rekrutacji").
// To dowód, że indeksy działają w trybie boolowskim — a przy okazji, że
// indeksy FULLTEXT na threads i social_posts przestały być martwe.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('search — jedno pole na cały Portal', () => {
  let ctx: AppContext;
  const email = `szukaj-${run}@test.local`;
  let cookie = '';
  let userId = '';

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName: 'Szukajka Testowa' },
    });
    cookie = res.headers['set-cookie'] as string;
    userId = (res.json() as { user: { id: string } }).user.id;

    // Wpis społecznościowy z charakterystyczną frazą.
    await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie },
      payload: { body: `Notatka ${run} o rekrutacji zespołu wdrożeniowego i onboardingu.` },
    });
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.socialPost.deleteMany({ where: { authorUserId: userId } });
    await ctx.prisma.activityItem.deleteMany({ where: { actorId: userId } });
    await ctx.prisma.user.deleteMany({ where: { email } });
    await ctx.close();
  });

  it('znajduje po PREFIKSIE — „rekrut" trafia w „rekrutacji"', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/search?q=rekrut' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      counts: Record<string, number>;
      posts: Array<{ excerpt: string }>;
    };
    // To jest dowód, że indeks social_posts(body) żyje i pracuje w BOOLEAN MODE
    // (w NATURAL LANGUAGE prefiks nie zadziałałby w ogóle).
    expect(body.counts.posts).toBeGreaterThan(0);
    expect(body.posts[0]!.excerpt).toContain('rekrutacj');
  });

  it('zawęża zakres, ale liczniki pokazują cały obraz', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/search?q=rekrut&scope=posts' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { listings: unknown[]; posts: unknown[]; counts: unknown };
    expect(body.posts.length).toBeGreaterThan(0);
    expect(body.listings).toHaveLength(0);
    expect(body.counts).toBeDefined();
  });

  it('odrzuca zapytania za krótkie', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/search?q=a' });
    expect(res.statusCode).toBe(400);
  });

  it('bełkot zwraca puste wyniki, a nie błąd 500', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/search?q=qwertyzxcvbasdfgh',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { counts: Record<string, number> };
    expect(Object.values(body.counts).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('ANTY-MLM: wyszukiwanie nie tworzy zdarzeń ani punktów', async () => {
    const startedAt = new Date();
    for (const q of ['rekrut', 'zespol', 'wdrozenie']) {
      await ctx.app.inject({ method: 'GET', url: `/api/v1/search?q=${q}` });
    }
    expect(await ctx.prisma.outboxEvent.count({ where: { createdAt: { gte: startedAt } } })).toBe(
      0,
    );
    expect(await ctx.prisma.pointEvent.count({ where: { userId } })).toBe(0);
  });
});

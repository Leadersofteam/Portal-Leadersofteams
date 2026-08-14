// Tematy (#hashtagi) end-to-end (S17).
//
// Tematy powstają w KONSUMENCIE zdarzenia, nie przy zapisie treści — tak samo
// jak oś aktywności. Ten test przechodzi więc pełną drogę: publikacja → konsument
// → strona tematu, bo sprawdzenie samego parsera (`shared/topics.test.ts`)
// nie powiedziałoby nic o tym, czy projekcja w ogóle jest wywoływana.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';
import { createLadderService } from '../ladder/index';
import { createSocialService } from './service';
import type { SocialService } from './service';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();
// Temat unikalny dla przebiegu — baza dev jest WSPÓŁDZIELONA i akumuluje dane,
// więc „pierwszy pasujący temat" prędzej czy później trafiłby na cudzą resztkę.
const TOPIC = `kanarek${run}`;

describe.skipIf(!hasInfra)('tematy (#hashtagi)', () => {
  let ctx: AppContext;
  let social: SocialService;
  const email = `topics-${run}@test.local`;
  let cookie = '';
  let userId = '';
  const postIds: string[] = [];

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const identity = (await import('../identity/index')).createIdentityService(ctx.prisma);
    social = createSocialService({
      prisma: ctx.prisma,
      identity,
      ladder: createLadderService(ctx.prisma),
    });
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName: 'Autor Tematów' },
    });
    expect(res.statusCode).toBe(201);
    cookie = res.headers['set-cookie'] as string;
    userId = (res.json() as { user: { id: string } }).user.id;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.socialPostTopic.deleteMany({ where: { postId: { in: postIds } } });
    await ctx.prisma.topic.deleteMany({ where: { slug: { startsWith: 'kanarek' } } });
    await ctx.prisma.activityItem.deleteMany({ where: { actorId: userId } });
    await ctx.prisma.socialPost.deleteMany({ where: { authorUserId: userId } });
    await ctx.prisma.user.deleteMany({ where: { email } });
    await ctx.close();
  });

  async function publish(body: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie },
      payload: { body },
    });
    expect(res.statusCode).toBe(201);
    const id = (res.json() as { id: string }).id;
    postIds.push(id);
    // Konsument (w produkcji wywołuje go worker) — tu wołamy go wprost,
    // bo test nie uruchamia kolejki.
    await social.onSocialPostPublished({ postId: id, authorUserId: userId });
    return id;
  }

  it('wpis z #tematem trafia na stronę tematu', async () => {
    await publish(`Wnioski z wdrożenia #${TOPIC} po trzech miesiącach.`);

    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/topics/${TOPIC}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { topic: { slug: string }; items: Array<{ body: string }> };
    expect(body.topic.slug).toBe(TOPIC);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]!.body).toContain(TOPIC);
  }, 60_000);

  it('warianty pisowni trafiają do JEDNEGO tematu', async () => {
    await publish(`Jeszcze raz o #${TOPIC.toUpperCase()} — tym razem z liczbami.`);

    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/topics/${TOPIC}` });
    const body = res.json() as { items: unknown[] };
    // Gdyby wielkość liter tworzyła osobny temat, rozmowa rozpadłaby się na
    // dwie strony i żadna nie pokazywałaby pełnego obrazu.
    expect(body.items).toHaveLength(2);
  }, 60_000);

  it('usunięty wpis znika ze strony tematu', async () => {
    const id = await publish(`Ten wpis zaraz zniknie #${TOPIC}`);
    const removed = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/social/posts/${id}`,
      headers: { cookie },
    });
    expect(removed.statusCode).toBe(200);

    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/topics/${TOPIC}` });
    const body = res.json() as { items: Array<{ id: string }> };
    // Powiązanie zostaje w bazie, ale strona tematu filtruje po `deletedAt` —
    // inaczej po usunięciu treści zostałaby tu pusta pozycja.
    expect(body.items.map((i) => i.id)).not.toContain(id);
  }, 60_000);

  it('nieistniejący temat daje 404, a nie pustą stronę', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/topics/na-pewno-nie-ma-takiego-${run}`,
    });
    expect(res.statusCode).toBe(404);
  }, 60_000);

  it('popularne tematy zwracają kształt gotowy do chipów', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/topics/popular' });
    expect(res.statusCode).toBe(200);
    const { topics } = res.json() as {
      topics: Array<{ name: string; slug: string; count: number }>;
    };
    const mine = topics.find((t) => t.slug === TOPIC);
    expect(mine?.count).toBeGreaterThan(0);
  }, 60_000);
});

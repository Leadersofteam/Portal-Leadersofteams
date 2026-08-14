// Wpisy portalowe (X-lite): publikacja, walidacja, komentarze, „doceniam",
// widoczność dla gościa i sprzątanie feedu po usunięciu treści.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';
import { createLadderService } from '../ladder/index';
import { createSocialService } from './service';
import type { SocialService } from './service';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('social — wpisy portalowe', () => {
  let ctx: AppContext;
  let social: SocialService;
  const emails = [`wpis-autor-${run}@test.local`, `wpis-obcy-${run}@test.local`];
  let authorCookie = '';
  let strangerCookie = '';
  let authorId = '';
  let strangerId = '';
  let postId = '';

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
    const identity = (await import('../identity/index')).createIdentityService(ctx.prisma);
    social = createSocialService({
      prisma: ctx.prisma,
      identity,
      ladder: createLadderService(ctx.prisma),
    });
    const author = await register(emails[0]!, 'Autor Wpisów');
    const stranger = await register(emails[1]!, 'Obcy Czytelnik');
    authorCookie = author.cookie;
    authorId = author.userId;
    strangerCookie = stranger.cookie;
    strangerId = stranger.userId;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.socialReaction.deleteMany({
      where: { userId: { in: [authorId, strangerId] } },
    });
    await ctx.prisma.socialComment.deleteMany({
      where: { authorUserId: { in: [authorId, strangerId] } },
    });
    await ctx.prisma.socialPost.deleteMany({
      where: { authorUserId: { in: [authorId, strangerId] } },
    });
    await ctx.prisma.activityItem.deleteMany({
      where: { actorId: { in: [authorId, strangerId] } },
    });
    await ctx.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await ctx.close();
  });

  it('publikuje wpis i odrzuca treść pustą oraz dłuższą niż 600 znaków', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: authorCookie },
      payload: {
        body: 'Pierwszy wpis na Portalu: dziś domknąłem rekrutację zespołu wdrożeniowego.',
      },
    });
    expect(created.statusCode).toBe(201);
    postId = (created.json() as { id: string }).id;

    const empty = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: authorCookie },
      payload: { body: '   ' },
    });
    expect(empty.statusCode).toBe(400);

    const tooLong = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: authorCookie },
      payload: { body: 'x'.repeat(601) },
    });
    expect(tooLong.statusCode).toBe(400);
  });

  it('gość czyta wpis bez logowania', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/social/posts/${postId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { post: { body: string; isOwn: boolean; appreciations: number } };
    expect(body.post.body).toContain('rekrutację');
    expect(body.post.isOwn).toBe(false);
  });

  it('„doceniam" jest idempotentne i odwracalne', async () => {
    const first = await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/social/posts/${postId}/appreciate`,
      headers: { cookie: strangerCookie },
    });
    expect((first.json() as { count: number }).count).toBe(1);

    // Powtórka nie mnoży wierszy (klucz złożony postId+userId).
    const again = await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/social/posts/${postId}/appreciate`,
      headers: { cookie: strangerCookie },
    });
    expect((again.json() as { count: number }).count).toBe(1);

    const off = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/social/posts/${postId}/appreciate`,
      headers: { cookie: strangerCookie },
    });
    expect((off.json() as { count: number; appreciated: boolean }).count).toBe(0);
  });

  it('komentarze: jeden poziom zagłębienia, rodzic musi należeć do wpisu', async () => {
    const parent = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/social/posts/${postId}/comments`,
      headers: { cookie: strangerCookie },
      payload: { body: 'Jak dobierałeś kryteria oceny kandydatów?' },
    });
    expect(parent.statusCode).toBe(201);
    const parentId = (parent.json() as { id: string }).id;

    const reply = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/social/posts/${postId}/comments`,
      headers: { cookie: authorCookie },
      payload: { body: 'Trzy twarde kryteria i jedno miękkie.', parentId },
    });
    expect(reply.statusCode).toBe(201);

    // Odpowiedź na odpowiedź — odcięta (ADR-010).
    const tooDeep = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/social/posts/${postId}/comments`,
      headers: { cookie: strangerCookie },
      payload: { body: 'A które miękkie?', parentId: (reply.json() as { id: string }).id },
    });
    expect(tooDeep.statusCode).toBe(400);

    // Rodzic z innego wpisu — odcięty.
    const other = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: authorCookie },
      payload: { body: 'Zupełnie inny wpis, żeby mieć obcego rodzica komentarza.' },
    });
    const foreign = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/social/posts/${(other.json() as { id: string }).id}/comments`,
      headers: { cookie: strangerCookie },
      payload: { body: 'Komentarz z obcym rodzicem.', parentId },
    });
    expect(foreign.statusCode).toBe(400);
  });

  it('cudzego wpisu nie da się edytować ani usunąć', async () => {
    const edit = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/social/posts/${postId}`,
      headers: { cookie: strangerCookie },
      payload: { body: 'Przejmuję ten wpis.' },
    });
    expect(edit.statusCode).toBe(403);

    const remove = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/social/posts/${postId}`,
      headers: { cookie: strangerCookie },
    });
    expect(remove.statusCode).toBe(403);
  });

  it('usunięcie wpisu zabiera też jego ślad z feedu (bez sieroty linkującej w 404)', async () => {
    // Materializacja jak w workerze.
    await social.onSocialPostPublished({ postId, authorUserId: authorId });
    expect(
      await ctx.prisma.activityItem.count({
        where: { type: 'SOCIAL_POST_PUBLISHED', subjectId: postId },
      }),
    ).toBe(1);

    const removed = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/social/posts/${postId}`,
      headers: { cookie: authorCookie },
    });
    expect(removed.statusCode).toBe(200);

    expect(
      await ctx.prisma.activityItem.count({
        where: { type: 'SOCIAL_POST_PUBLISHED', subjectId: postId },
      }),
    ).toBe(0);

    const gone = await ctx.app.inject({ method: 'GET', url: `/api/v1/social/posts/${postId}` });
    expect(gone.statusCode).toBe(404);
  });
});

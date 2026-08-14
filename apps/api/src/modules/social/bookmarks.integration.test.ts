// Zakładki (S17) — PRYWATNA półka „na później".
//
// Czego pilnujemy, poza szczęśliwą ścieżką:
//   1. ADR-010 — nigdzie nie wycieka LICZBA zapisań. Test czyta surowe ciała
//      odpowiedzi, bo pole dołożone kiedyś „bo się przyda" nie zapaliłoby się
//      w asercji na kształt obiektu.
//   2. Prywatność — zakładka jednej osoby nie jest widoczna dla drugiej ANI
//      w liście, ANI w stanie widza przy treści.
//   3. Treść zdjęta przez moderatora znika z półki (wiersz zostaje wiszący —
//      polimorf bez klucza obcego, patrz komentarz w schemacie).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('zakładki: prywatna półka bez licznika', () => {
  let ctx: AppContext;
  const emails = [`bm-a-${run}@test.local`, `bm-b-${run}@test.local`];
  let aCookie = '';
  let bCookie = '';
  let aId = '';
  let bId = '';
  let groupId = '';
  let socialPostId = '';
  let groupPostId = '';

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
    const a = await register(emails[0]!, 'Zakładka Anna');
    const b = await register(emails[1]!, 'Zakładka Bartek');
    aCookie = a.cookie;
    bCookie = b.cookie;
    aId = a.userId;
    bId = b.userId;

    // Grupa potrzebna do drugiego rodzaju treści. Poziom ustawiamy wprost
    // w projekcji (jak w testach Drabinki) — bramka lvl 2 nie jest tu tematem.
    await ctx.prisma.ladderState.upsert({
      where: { userId: bId },
      update: { level: 2, isLeader: true },
      create: { userId: bId, level: 2, isLeader: true, rulesetVersion: 'v1' },
    });
    const group = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: { cookie: bCookie },
      payload: { name: `Zakładki ${run}`, type: 'OPEN' },
    });
    expect(group.statusCode).toBe(201);
    groupId = (group.json() as { id: string }).id;

    const post = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/posts`,
      headers: { cookie: bCookie },
      payload: { title: `Post do zapisania ${run}`, body: 'Treść dyskusji w grupie branżowej.' },
    });
    expect(post.statusCode).toBe(201);
    groupPostId = (post.json() as { id: string }).id;

    const social = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: bCookie },
      payload: { body: `Wpis do zapisania ${run}.` },
    });
    expect(social.statusCode).toBe(201);
    socialPostId = (social.json() as { id: string }).id;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    const userIds = [aId, bId];
    await ctx.prisma.bookmark.deleteMany({ where: { userId: { in: userIds } } });
    if (groupId) await ctx.prisma.group.deleteMany({ where: { id: groupId } });
    await ctx.prisma.socialPost.deleteMany({ where: { authorUserId: { in: userIds } } });
    await ctx.prisma.activityItem.deleteMany({ where: { actorId: { in: userIds } } });
    await ctx.prisma.ladderState.deleteMany({ where: { userId: { in: userIds } } });
    await ctx.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await ctx.close();
  });

  function bookmark(cookie: string, type: string, id: string, method: 'PUT' | 'DELETE' = 'PUT') {
    return ctx.app.inject({
      method,
      url: `/api/v1/me/bookmarks/${type}/${id}`,
      headers: { cookie },
    });
  }

  it('zapisuje oba rodzaje treści, a powtórne zapisanie jest bezgłośne', async () => {
    expect((await bookmark(aCookie, 'SOCIAL_POST', socialPostId)).statusCode).toBe(200);
    expect((await bookmark(aCookie, 'POST', groupPostId)).statusCode).toBe(200);
    // Idempotencja z klucza złożonego — drugie kliknięcie nie może dać 500.
    expect((await bookmark(aCookie, 'SOCIAL_POST', socialPostId)).statusCode).toBe(200);

    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/bookmarks',
      headers: { cookie: aCookie },
    });
    expect(list.statusCode).toBe(200);
    const items = (list.json() as { items: Array<{ subjectId: string; subjectType: string }> })
      .items;
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.subjectId).sort()).toEqual([socialPostId, groupPostId].sort());
  });

  it('nie zapisuje treści, której nie ma', async () => {
    const res = await bookmark(aCookie, 'SOCIAL_POST', 'ckzzzzzzzzzzzzzzzzzzzzzzz');
    expect(res.statusCode).toBe(404);
  });

  it('ADR-010: ŻADNA odpowiedź nie niesie liczby zapisań', async () => {
    const bodies = await Promise.all(
      [
        { url: '/api/v1/me/bookmarks', cookie: aCookie },
        { url: `/api/v1/social/posts/${socialPostId}`, cookie: aCookie },
        { url: '/api/v1/feed?scope=all', cookie: aCookie },
        { url: `/api/v1/groups/${groupId}/feed`, cookie: aCookie },
        { url: `/api/v1/posts/${groupPostId}`, cookie: aCookie },
      ].map(async ({ url, cookie }) => {
        const res = await ctx.app.inject({ method: 'GET', url, headers: { cookie } });
        expect(res.statusCode).toBe(200);
        return res.body;
      }),
    );
    // Czytamy SUROWE ciało, nie kształt obiektu: pole dołożone kiedyś „bo się
    // przyda" przeszłoby przez asercję na znane pola i wyciekło na produkcję.
    for (const body of bodies) {
      expect(body).not.toMatch(/bookmarksCount|bookmarkCount|savesCount|"saves"/i);
    }
  });

  it('zakładki są prywatne: B nie widzi półki A ani jej śladu przy treści', async () => {
    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/bookmarks',
      headers: { cookie: bCookie },
    });
    expect(list.statusCode).toBe(200);
    expect((list.json() as { items: unknown[] }).items).toHaveLength(0);

    const post = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/social/posts/${socialPostId}`,
      headers: { cookie: bCookie },
    });
    expect((post.json() as { post: { viewerBookmarked: boolean } }).post.viewerBookmarked).toBe(
      false,
    );

    const mine = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/social/posts/${socialPostId}`,
      headers: { cookie: aCookie },
    });
    expect((mine.json() as { post: { viewerBookmarked: boolean } }).post.viewerBookmarked).toBe(
      true,
    );
  });

  it('gość dostaje 401, a nie pustą listę', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/me/bookmarks' });
    expect(res.statusCode).toBe(401);
  });

  it('treść ukryta przez moderatora znika z półki', async () => {
    await ctx.prisma.post.update({
      where: { id: groupPostId },
      data: { moderationStatus: 'HIDDEN' },
    });
    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/bookmarks',
      headers: { cookie: aCookie },
    });
    const items = (list.json() as { items: Array<{ subjectId: string }> }).items;
    expect(items.map((i) => i.subjectId)).not.toContain(groupPostId);
    await ctx.prisma.post.update({
      where: { id: groupPostId },
      data: { moderationStatus: 'VISIBLE' },
    });
  });

  it('zdjęcie z półki jest natychmiastowe i idempotentne', async () => {
    expect((await bookmark(aCookie, 'SOCIAL_POST', socialPostId, 'DELETE')).statusCode).toBe(200);
    expect((await bookmark(aCookie, 'SOCIAL_POST', socialPostId, 'DELETE')).statusCode).toBe(200);
    const list = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/bookmarks',
      headers: { cookie: aCookie },
    });
    const items = (list.json() as { items: Array<{ subjectId: string }> }).items;
    expect(items.map((i) => i.subjectId)).not.toContain(socialPostId);
  });
});

// Social (X-lite): follow → materializacja feedu (handlery workera wywołane
// wprost) → chronologiczny feed + profil @handle. Zero punktów — social nic
// nie emituje dla ladder (moduł w ogóle nie emituje zdarzeń).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';
import { extractMentions } from '../../shared/mentions';
import { createLadderService } from '../ladder/index';
import { createSocialService } from './service';
import type { SocialService } from './service';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe('extractMentions', () => {
  it('wyciąga unikatowe handle, limit 5, bez wielkości liter', () => {
    expect(extractMentions('cześć @jan-kowalski i @Anna! @jan-kowalski')).toEqual([
      'jan-kowalski',
      'anna',
    ]);
    const many = extractMentions('@a1 @b2 @c3 @d4 @e5 @f6 @g7');
    expect(many).toHaveLength(5);
  });
});

describe.skipIf(!hasInfra)('social — follow, feed, profil', () => {
  let ctx: AppContext;
  let social: SocialService;
  let followerCookie = '';
  let followerId = '';
  let leaderId = '';
  const emails = [`obserwator-${run}@test.local`, `gwiazda-${run}@test.local`];

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
    const follower = await register(emails[0]!, 'Obserwator Testowy');
    followerCookie = follower.cookie;
    followerId = follower.userId;
    const leader = await register(emails[1]!, 'Gwiazda Liderów');
    leaderId = leader.userId;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.activityItem.deleteMany({
      where: { actorId: { in: [leaderId, followerId] } },
    });
    // Wpis z testu „własny wpis w scope=following" trzyma FK do autora —
    // bez tego kasowania user.deleteMany pada i suita czerwienieje w afterAll.
    await ctx.prisma.socialPost.deleteMany({
      where: { authorUserId: { in: [leaderId, followerId] } },
    });
    await ctx.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await ctx.close();
  });

  it('follow: nadaje obserwowanemu handle i pojawia się w /me/social', async () => {
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/users/${leaderId}/follow`,
      headers: { cookie: followerCookie },
    });
    expect(res.statusCode).toBe(200);

    const target = await ctx.prisma.user.findUnique({ where: { id: leaderId } });
    expect(target?.handle).toBeTruthy();

    const mine = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/social',
      headers: { cookie: followerCookie },
    });
    expect((mine.json() as { following: number }).following).toBe(1);
  });

  it('nie można obserwować samego siebie', async () => {
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/users/${followerId}/follow`,
      headers: { cookie: followerCookie },
    });
    expect(res.statusCode).toBe(400);
  });

  it('feed: materializacja aktywności + chronologia + idempotencja', async () => {
    await social.onLevelAchieved({ userId: leaderId, level: 2, achievementId: `ach-${run}` });
    // Retry joba w workerze nie może zdublować wpisu (unikat type+subjectId).
    await social.onLevelAchieved({ userId: leaderId, level: 2, achievementId: `ach-${run}` });

    const feed = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/feed',
      headers: { cookie: followerCookie },
    });
    expect(feed.statusCode).toBe(200);
    const body = feed.json() as {
      items: Array<{ type: string; actor: { id: string; handle: string | null } }>;
    };
    const levelItems = body.items.filter((i) => i.type === 'LEVEL_ACHIEVED');
    expect(levelItems).toHaveLength(1);
    expect(levelItems[0]!.actor.id).toBe(leaderId);
    expect(levelItems[0]!.actor.handle).toBeTruthy();
  });

  it('profil @handle: liczniki i aktywność publiczna', async () => {
    const target = await ctx.prisma.user.findUniqueOrThrow({ where: { id: leaderId } });
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/profiles/${target.handle}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { followers: number; activity: Array<{ type: string }> };
    expect(body.followers).toBe(1);
    expect(body.activity.some((a) => a.type === 'LEVEL_ACHIEVED')).toBe(true);
  });

  it('unfollow opróżnia feed', async () => {
    await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/users/${leaderId}/follow`,
      headers: { cookie: followerCookie },
    });
    const feed = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/feed',
      headers: { cookie: followerCookie },
    });
    expect((feed.json() as { followingCount: number }).followingCount).toBe(0);
  });

  // Własna aktywność należy do osi „Obserwowani" (W-04): autor tuż po
  // publikacji ma widzieć swój wpis, nawet gdy nikogo nie obserwuje — inaczej
  // wita go pusty stan i wpis wygląda na zgubiony.
  it('feed: własny wpis widoczny w scope=following bez obserwowania kogokolwiek', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: followerCookie },
      payload: { body: `Mój pierwszy wpis ${run} — czy siebie widzę?` },
    });
    expect(created.statusCode).toBe(201);
    const postId = (created.json() as { id: string }).id;
    // Materializacja feedu żyje w workerze — w teście wołamy handler wprost.
    await social.onSocialPostPublished({ postId, authorUserId: followerId });

    const feed = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/feed?scope=following',
      headers: { cookie: followerCookie },
    });
    expect(feed.statusCode).toBe(200);
    const body = feed.json() as {
      items: Array<{ type: string; subjectId: string }>;
      followingCount: number;
    };
    // followingCount dalej mówi o OBSERWOWANYCH (0) — zachęta do obserwowania
    // ma prawo się wyświetlić, ale wpis autora musi być na osi.
    expect(body.followingCount).toBe(0);
    expect(
      body.items.some((i) => i.type === 'SOCIAL_POST_PUBLISHED' && i.subjectId === postId),
    ).toBe(true);
  });

  // Zakres „cała społeczność" jest oknem wystawowym Portalu: gość ma zobaczyć
  // żywe miejsce, a nie ekran logowania. Oś obserwowanych pozostaje prywatna —
  // bez sesji nie ma czyjej osi pokazać.
  it('feed: scope=all działa dla gościa, scope=following wymaga sesji', async () => {
    const guest = await ctx.app.inject({ method: 'GET', url: '/api/v1/feed?scope=all' });
    expect(guest.statusCode).toBe(200);
    const body = guest.json() as { items: Array<{ actor: { id: string } }>; scope: string };
    expect(body.scope).toBe('all');
    // Aktywność obcego użytkownika jest widoczna mimo braku obserwowania.
    expect(body.items.some((i) => i.actor.id === leaderId)).toBe(true);

    const guestFollowing = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/feed?scope=following',
    });
    expect(guestFollowing.statusCode).toBe(401);
  });
});

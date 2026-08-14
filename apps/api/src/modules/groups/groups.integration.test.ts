// Testy integracyjne modułu groups na realnym MySQL/Redis: bramka poziomu na
// zakładanie grup, dołączanie OPEN/MODERATED z akceptacją, posty/komentarze
// (wątkowanie 1 poziom), reakcje (unikat), feed kursorem, ślad outbox.
//
// KLUCZOWY TEST ANTY-MLM (ADR-004/010 dec. 4): pełny cykl aktywności w grupie
// NIE tworzy żadnego PointEvent i nie zmienia poziomu Drabinki.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { ladderSubscriptions } from '../ladder/events';
import type { LadderService } from '../ladder/index';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('groups — grupy branżowe, posty, komentarze, reakcje (anty-MLM)', () => {
  let ctx: AppContext;
  let founderCookie = '';
  let memberCookie = '';
  let outsiderCookie = '';
  let founderId = '';
  let memberId = '';
  let outsiderId = '';
  let openGroupId = '';
  let moderatedGroupId = '';
  let postId = '';

  const emails = {
    founder: `grp-founder-${run}@example.com`,
    member: `grp-member-${run}@example.com`,
    outsider: `grp-outsider-${run}@example.com`,
  };

  async function register(email: string, displayName: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    const raw = res.headers['set-cookie'];
    const cookie = String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '';
    return { cookie, userId: res.json().user.id as string };
  }

  function post(cookie: string, url: string, payload?: Record<string, unknown>) {
    return ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    ({ cookie: founderCookie, userId: founderId } = await register(emails.founder, 'Założyciel'));
    ({ cookie: memberCookie, userId: memberId } = await register(emails.member, 'Członek'));
    ({ cookie: outsiderCookie, userId: outsiderId } = await register(emails.outsider, 'Obcy'));

    // Założyciel ma poziom 2 (bramka zakładania grup) — projekcja LadderState
    // ustawiana wprost (jak w testach Drabinki), bez naliczania punktów.
    await ctx.prisma.ladderState.upsert({
      where: { userId: founderId },
      update: { level: 2, isLeader: true },
      create: { userId: founderId, level: 2, isLeader: true, rulesetVersion: 'v1' },
    });
  }, 120_000);

  afterAll(async () => {
    if (ctx) {
      const userIds = [founderId, memberId, outsiderId];
      const groupIds = [openGroupId, moderatedGroupId].filter(Boolean);
      if (groupIds.length) await ctx.prisma.group.deleteMany({ where: { id: { in: groupIds } } });
      await ctx.prisma.ladderState.deleteMany({ where: { userId: { in: userIds } } });
      await ctx.prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await ctx.prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
      await ctx.close();
    }
  });

  it('zakładanie grupy wymaga poziomu 2: lvl 0 → 403, lvl 2 → 201', async () => {
    const denied = await post(outsiderCookie, '/api/v1/groups', {
      name: `Grupa obcego ${run}`,
      type: 'OPEN',
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe('LEVEL_TOO_LOW');

    const created = await post(founderCookie, '/api/v1/groups', {
      name: `Grupa AI w biznesie ${run}`,
      description: 'Dyskusje o zastosowaniach AI.',
      type: 'OPEN',
    });
    expect(created.statusCode).toBe(201);
    openGroupId = created.json().id;
    expect(created.json().type).toBe('OPEN');
  });

  it('dołączenie do grupy OPEN jest natychmiast aktywne', async () => {
    const join = await post(memberCookie, `/api/v1/groups/${openGroupId}/join`);
    expect(join.statusCode).toBe(200);
    expect(join.json().status).toBe('ACTIVE');

    // Ponowne dołączenie → 409 (unikat członkostwa).
    const dup = await post(memberCookie, `/api/v1/groups/${openGroupId}/join`);
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('ALREADY_MEMBER');
  });

  it('grupa MODERATED: dołączenie = PENDING → akceptacja moderatora → ACTIVE', async () => {
    const created = await post(founderCookie, '/api/v1/groups', {
      name: `Grupa moderowana ${run}`,
      type: 'MODERATED',
    });
    moderatedGroupId = created.json().id;

    const join = await post(memberCookie, `/api/v1/groups/${moderatedGroupId}/join`);
    expect(join.json().status).toBe('PENDING');

    // Moderator (założyciel) widzi oczekujących i akceptuje.
    const pending = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/groups/${moderatedGroupId}/members/pending`,
      headers: { cookie: founderCookie },
    });
    expect(pending.statusCode).toBe(200);
    const req = pending.json().pending.find((p: { userId: string }) => p.userId === memberId);
    expect(req).toBeDefined();

    // Nie-moderator nie może akceptować.
    const forbidden = await post(outsiderCookie, `/api/v1/memberships/${req.membershipId}/approve`);
    expect(forbidden.statusCode).toBe(403);

    const approve = await post(founderCookie, `/api/v1/memberships/${req.membershipId}/approve`);
    expect(approve.statusCode).toBe(200);

    const membership = await ctx.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: moderatedGroupId, userId: memberId } },
    });
    expect(membership?.status).toBe('ACTIVE');
  });

  it('post: tylko członek publikuje; obcy dostaje 403', async () => {
    const denied = await post(outsiderCookie, `/api/v1/groups/${openGroupId}/posts`, {
      type: 'DISCUSSION',
      title: 'Próba posta bez członkostwa',
      body: 'Nie powinienem móc tego opublikować.',
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe('NOT_GROUP_MEMBER');

    const created = await post(memberCookie, `/api/v1/groups/${openGroupId}/posts`, {
      type: 'CASE_STUDY',
      title: 'Jak wdrożyliśmy automatyzację',
      body: 'Opis case study z realnego wdrożenia u klienta B2B.',
    });
    expect(created.statusCode).toBe(201);
    postId = created.json().id;
  });

  it('komentarze: wątkowanie maks. 1 poziom (odpowiedź na odpowiedź → 400)', async () => {
    const top = await post(memberCookie, `/api/v1/posts/${postId}/comments`, {
      body: 'Pierwszy komentarz.',
    });
    expect(top.statusCode).toBe(201);
    const topId = top.json().id;

    const reply = await post(founderCookie, `/api/v1/posts/${postId}/comments`, {
      body: 'Odpowiedź na komentarz.',
      parentId: topId,
    });
    expect(reply.statusCode).toBe(201);

    const nested = await post(memberCookie, `/api/v1/posts/${postId}/comments`, {
      body: 'Odpowiedź na odpowiedź — niedozwolona.',
      parentId: reply.json().id,
    });
    expect(nested.statusCode).toBe(400);
    expect(nested.json().error.code).toBe('MAX_DEPTH');
  });

  it('reakcja „doceniam" jest idempotentna (unikat post+user)', async () => {
    expect((await post(memberCookie, `/api/v1/posts/${postId}/react`)).statusCode).toBe(200);
    expect((await post(memberCookie, `/api/v1/posts/${postId}/react`)).statusCode).toBe(200);

    const detail = await ctx.app.inject({ method: 'GET', url: `/api/v1/posts/${postId}` });
    expect(detail.json().post.reactionsCount).toBe(1);
    expect(detail.json().comments.length).toBe(2);
  });

  it('feed grupy: chronologiczny, paginacja kursorem', async () => {
    // Drugi post, żeby feed miał ≥ 2 pozycje.
    await post(memberCookie, `/api/v1/groups/${openGroupId}/posts`, {
      type: 'IDEA',
      title: 'Pomysł na usprawnienie',
      body: 'Krótki opis pomysłu do przedyskutowania w grupie.',
    });

    const firstPage = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/groups/${openGroupId}/feed?limit=1`,
    });
    expect(firstPage.statusCode).toBe(200);
    expect(firstPage.json().posts).toHaveLength(1);
    expect(firstPage.json().nextCursor).not.toBeNull();

    const secondPage = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/groups/${openGroupId}/feed?limit=1&cursor=${firstPage.json().nextCursor}`,
    });
    expect(secondPage.json().posts).toHaveLength(1);
    expect(secondPage.json().posts[0].id).not.toBe(firstPage.json().posts[0].id);
  });

  // --- pierwsza linia moderacji (S17) ---------------------------------------

  it('przypinanie: tylko moderator grupy, najwyżej jeden post, bez duplikatu w liście', async () => {
    const denied = await post(memberCookie, `/api/v1/posts/${postId}/pin`);
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe('NOT_GROUP_MODERATOR');

    expect((await post(founderCookie, `/api/v1/posts/${postId}/pin`)).statusCode).toBe(200);

    const feed = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/groups/${openGroupId}/feed`,
    });
    expect(feed.json().pinned?.id).toBe(postId);
    // Przypięty post NIE MOŻE stać jednocześnie w liście chronologicznej —
    // inaczej ta sama treść byłaby w grupie dwa razy.
    expect(feed.json().posts.map((p: { id: string }) => p.id)).not.toContain(postId);

    // Drugi pin odpina pierwszy (jeden „zacznij tutaj" na grupę).
    const second = await post(memberCookie, `/api/v1/groups/${openGroupId}/posts`, {
      type: 'DISCUSSION',
      title: `Drugi kandydat na przypięcie ${run}`,
      body: 'Treść drugiego postu, wystarczająco długa dla walidacji.',
    });
    const secondId = second.json().id;
    expect((await post(founderCookie, `/api/v1/posts/${secondId}/pin`)).statusCode).toBe(200);
    expect(
      await ctx.prisma.post.count({ where: { groupId: openGroupId, pinnedAt: { not: null } } }),
    ).toBe(1);

    const unpin = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/posts/${secondId}/pin`,
      headers: { cookie: founderCookie },
    });
    expect(unpin.statusCode).toBe(200);
    const afterUnpin = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/groups/${openGroupId}/feed`,
    });
    expect(afterUnpin.json().pinned).toBeNull();
  });

  it('ukrycie posta przez moderatora GRUPY zdejmuje go z feedu', async () => {
    const created = await post(memberCookie, `/api/v1/groups/${openGroupId}/posts`, {
      type: 'DISCUSSION',
      title: `Post do ukrycia ${run}`,
      body: 'Treść, która zaraz zniknie z listy grupy.',
    });
    const hideId = created.json().id;

    const denied = await post(outsiderCookie, `/api/v1/posts/${hideId}/hide`);
    expect(denied.statusCode).toBe(403);

    expect((await post(founderCookie, `/api/v1/posts/${hideId}/hide`)).statusCode).toBe(200);

    const feed = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/groups/${openGroupId}/feed`,
    });
    expect(feed.json().posts.map((p: { id: string }) => p.id)).not.toContain(hideId);
    // Ta sama ścieżka co w panelu platformy: zdarzenie dla projekcji feedu.
    const events = await ctx.prisma.outboxEvent.findMany({
      where: { type: 'groups.post_deleted' },
      select: { payload: true },
    });
    expect(JSON.stringify(events)).toContain(hideId);
  });

  it('skład grupy i role: awans, blokada ostatniego moderatora, degradacja', async () => {
    const denied = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/groups/${openGroupId}/members`,
      headers: { cookie: memberCookie },
    });
    expect(denied.statusCode).toBe(403);

    const list = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/groups/${openGroupId}/members`,
      headers: { cookie: founderCookie },
    });
    expect(list.statusCode).toBe(200);
    const founderRow = list
      .json()
      .members.find((m: { userId: string }) => m.userId === founderId) as { role: string };
    expect(founderRow.role).toBe('MODERATOR');
    const memberRow = list
      .json()
      .members.find((m: { userId: string }) => m.userId === memberId) as {
      membershipId: string;
      role: string;
    };
    expect(memberRow.role).toBe('MEMBER');

    // Grupa nie może zostać bez opieki: degradacja jedynego moderatora → 409.
    const founderMembership = await ctx.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: openGroupId, userId: founderId } },
    });
    const lastMod = await post(founderCookie, `/api/v1/memberships/${founderMembership!.id}/role`, {
      role: 'MEMBER',
    });
    expect(lastMod.statusCode).toBe(409);
    expect(lastMod.json().error.code).toBe('LAST_MODERATOR');

    const promote = await post(
      founderCookie,
      `/api/v1/memberships/${memberRow.membershipId}/role`,
      {
        role: 'MODERATOR',
      },
    );
    expect(promote.statusCode).toBe(200);

    // Awansowany dowiaduje się o roli — inaczej uprawnienie jest martwe.
    const roleEvents = await ctx.prisma.outboxEvent.findMany({
      where: { type: 'groups.membership_role_changed' },
      select: { payload: true },
    });
    expect(JSON.stringify(roleEvents)).toContain(memberId);

    // Teraz moderatorów jest dwoje, więc degradacja przechodzi.
    const demote = await post(founderCookie, `/api/v1/memberships/${memberRow.membershipId}/role`, {
      role: 'MEMBER',
    });
    expect(demote.statusCode).toBe(200);
  });

  it('wyproszenie: nie moderatora, nie siebie, a wyproszony nie wraca jednym kliknięciem', async () => {
    const membership = await ctx.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: moderatedGroupId, userId: memberId } },
    });
    const founderMembership = await ctx.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: moderatedGroupId, userId: founderId } },
    });

    const self = await post(founderCookie, `/api/v1/memberships/${founderMembership!.id}/ban`);
    expect(self.statusCode).toBe(409);
    expect(self.json().error.code).toBe('SELF_BAN');

    const banned = await post(founderCookie, `/api/v1/memberships/${membership!.id}/ban`);
    expect(banned.statusCode).toBe(200);
    const after = await ctx.prisma.groupMembership.findUnique({ where: { id: membership!.id } });
    expect(after?.status).toBe('BANNED');

    // ZASTANE do S17: powrót wpadał w kolizję unikatu i mówił „Jesteś już
    // członkiem" — komunikat, który w tej sytuacji kłamał.
    const rejoin = await post(memberCookie, `/api/v1/groups/${moderatedGroupId}/join`);
    expect(rejoin.statusCode).toBe(403);
    expect(rejoin.json().error.code).toBe('BANNED_FROM_GROUP');

    // Wyproszony traci prawo publikowania w tej grupie.
    const blocked = await post(memberCookie, `/api/v1/groups/${moderatedGroupId}/posts`, {
      type: 'DISCUSSION',
      title: 'Post po wyproszeniu',
      body: 'Nie powinien się opublikować po wyproszeniu z grupy.',
    });
    expect(blocked.statusCode).toBe(403);
  });

  it('outbox zawiera zdarzenia groups.* cyklu życia', async () => {
    const events = await ctx.prisma.outboxEvent.findMany({
      where: { type: { startsWith: 'groups.' } },
      select: { type: true },
    });
    const types = new Set(events.map((e) => e.type));
    for (const expected of [
      'groups.group_created',
      'groups.membership_requested',
      'groups.membership_accepted',
      'groups.post_published',
      'groups.comment_added',
      // S17 — moderator grupy: awans i zdjęcie treści. Oba konsumuje WYŁĄCZNIE
      // notifications/social; żadne nie ma prawa trafić do laddera (test niżej).
      'groups.membership_role_changed',
      'groups.post_deleted',
    ]) {
      expect(types).toContain(expected);
    }
  });

  it('ANTY-MLM: pełna aktywność w grupach NIE tworzy żadnego PointEvent', async () => {
    // Ani jeden punkt Drabinki za posty/komentarze/reakcje/członkostwo/założenie
    // ani za MODERACJĘ (S17): rola w grupie to obowiązek, nie status.
    const points = await ctx.prisma.pointEvent.count({
      where: { userId: { in: [founderId, memberId, outsiderId] } },
    });
    expect(points).toBe(0);

    // Dowód STRUKTURALNY, nie tylko na danych: żadne zdarzenie groups.* nie jest
    // kluczem w subskrypcjach laddera. Bez tego dołożenie nowego zdarzenia
    // (jak `membership_role_changed` w S17) mogłoby kiedyś otworzyć drogę
    // do punktów, a test dalej świeciłby na zielono.
    const groupEventTypes = [
      ...new Set(
        (
          await ctx.prisma.outboxEvent.findMany({
            where: { type: { startsWith: 'groups.' } },
            select: { type: true },
          })
        ).map((e) => e.type),
      ),
    ];
    expect(groupEventTypes.length).toBeGreaterThan(0);
    const ladderTypes = Object.keys(ladderSubscriptions({} as LadderService));
    for (const type of groupEventTypes) {
      expect(ladderTypes, `ladder subskrybuje "${type}" — to złamanie ADR-004`).not.toContain(type);
    }

    // Poziom niezmieniony: założyciel wciąż 2 (ustawiony wprost), reszta 0.
    const founderState = await ctx.prisma.ladderState.findUnique({ where: { userId: founderId } });
    expect(founderState?.level).toBe(2);
    const memberState = await ctx.prisma.ladderState.findUnique({ where: { userId: memberId } });
    expect(memberState?.level ?? 0).toBe(0);
  });
});

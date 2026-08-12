import type { CreateCommentInput, CreateGroupInput, CreatePostInput } from '@lot/contracts';
import type { Prisma } from '@prisma/client';

import type { Cache } from '../../shared/cache';
import type { PrismaClient } from '../../shared/db';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { extractMentions } from '../../shared/mentions';
import { emitEvent } from '../../shared/outbox';
import { enforceFreshAccountQuota, FRESH_ACCOUNT_LIMITS } from '../../shared/quota';
import type { Redis } from '../../shared/redis';
import type { IdentityService } from '../identity/index';
import type { LadderService } from '../ladder/index';

// Próg poziomu do zakładania grup (ADR-010: parametr konfiguracyjny, start lvl 2)
// — bariera anty-spam przy otwartej rejestracji (R-13). NIE jest to punktacja.
export const GROUP_CREATION_MIN_LEVEL = 2;

// Cache publicznego listingu grup (D3).
const GROUPS_CACHE_NS = 'groups';
const GROUPS_CACHE_TTL = 300;

export interface GroupsServiceDeps {
  prisma: PrismaClient;
  identity: Pick<IdentityService, 'getPublicUsers' | 'getUserCreatedAt' | 'getUserIdsByHandles'>;
  // ladder tylko do ODCZYTU poziomu (bramka) — żadnej krawędzi zdarzeń do ladder
  // (anty-MLM, ADR-010 dec. 4). Aktywność w groups nie generuje punktów.
  ladder: Pick<LadderService, 'getLevel'>;
  cache?: Cache;
  redis?: Redis;
}

const FEED_PAGE_DEFAULT = 20;

export function createGroupsService({ prisma, identity, ladder, cache, redis }: GroupsServiceDeps) {
  async function requireGroup(groupId: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundError('Grupa nie istnieje');
    return group;
  }

  async function membership(userId: string, groupId: string) {
    return prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  async function requireActiveMembership(userId: string, groupId: string) {
    const m = await membership(userId, groupId);
    if (!m || m.status !== 'ACTIVE') {
      throw new ForbiddenError('NOT_GROUP_MEMBER', 'Musisz być członkiem grupy');
    }
    return m;
  }

  async function moderatorUserIds(groupId: string): Promise<string[]> {
    const mods = await prisma.groupMembership.findMany({
      where: { groupId, role: 'MODERATOR', status: 'ACTIVE' },
      select: { userId: true },
    });
    return mods.map((m) => m.userId);
  }

  // Właściwy odczyt listingu grup (owinięty cache-aside w listGroups).
  async function loadGroups(filters: {
    industryId?: string;
    q?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = filters.limit ?? FEED_PAGE_DEFAULT;
    const where: Prisma.GroupWhereInput = {
      ...(filters.industryId ? { industryId: filters.industryId } : {}),
      ...(filters.q ? { name: { contains: filters.q } } : {}),
    };
    const rows = await prisma.group.findMany({
      where,
      include: { industry: true, _count: { select: { memberships: true, posts: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      groups: page.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        isSystem: g.isSystem,
        industry: g.industry ? { id: g.industry.id, name: g.industry.name } : null,
        membersCount: g._count.memberships,
        postsCount: g._count.posts,
      })),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  // Wzmianki @handle → zdarzenie dla notifications (zero punktów — ladder
  // nie subskrybuje groups.*).
  async function emitMentions(
    tx: Parameters<typeof emitEvent>[0],
    body: string,
    authorUserId: string,
    context: { groupId: string; postId: string },
  ) {
    const handles = extractMentions(body);
    if (handles.length === 0) return;
    const ids = await identity.getUserIdsByHandles(handles);
    for (const mentionedId of ids.values()) {
      if (mentionedId === authorUserId) continue;
      await emitEvent(tx, 'groups.user_mentioned', {
        mentionedUserId: mentionedId,
        authorUserId,
        ...context,
      });
    }
  }

  return {
    // Publiczne API dla modułu community (granice — ADR-002): community
    // bramkuje wątki/odpowiedzi członkostwem w grupie, nie sięgając do tabel
    // groups. Odczyt statusu członkostwa — bez żadnej logiki punktowej.
    async isActiveMember(userId: string, groupId: string): Promise<boolean> {
      const m = await membership(userId, groupId);
      return m?.status === 'ACTIVE';
    },

    async createGroup(userId: string, input: CreateGroupInput) {
      // Bramka poziomu (jak marketplace.submitOffer) — odczyt z projekcji ladder.
      const level = await ladder.getLevel(userId);
      if (level < GROUP_CREATION_MIN_LEVEL) {
        throw new ForbiddenError(
          'LEVEL_TOO_LOW',
          `Zakładanie grup wymaga poziomu ${GROUP_CREATION_MIN_LEVEL} w Drabince Lidera (Twój poziom: ${level})`,
        );
      }
      if (input.industryId) {
        const industry = await prisma.industry.findUnique({ where: { id: input.industryId } });
        if (!industry) throw new DomainError('UNKNOWN_INDUSTRY', 'Nieznana branża', 400);
      }
      const result = await prisma.$transaction(async (tx) => {
        const group = await tx.group.create({
          data: {
            name: input.name,
            description: input.description ?? null,
            industryId: input.industryId ?? null,
            type: input.type,
            createdById: userId,
            memberships: { create: { userId, role: 'MODERATOR', status: 'ACTIVE' } },
          },
        });
        await emitEvent(tx, 'groups.group_created', { groupId: group.id, createdById: userId });
        return { id: group.id, type: group.type };
      });
      await cache?.bump(GROUPS_CACHE_NS); // listing grup nieaktualny
      return result;
    },

    async join(userId: string, groupId: string) {
      const group = await requireGroup(groupId);
      // MODERATED → PENDING (akceptacja moderatora); OPEN → od razu ACTIVE.
      const status = group.type === 'MODERATED' ? 'PENDING' : 'ACTIVE';
      try {
        await prisma.groupMembership.create({
          data: { groupId, userId, role: 'MEMBER', status },
        });
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          throw new ConflictError(
            'ALREADY_MEMBER',
            'Jesteś już członkiem lub czekasz na akceptację',
          );
        }
        throw err;
      }
      if (status === 'PENDING') {
        // Powiadomienie do moderatorów o prośbie o dołączenie (payload z odbiorcami,
        // żeby notifications nie sięgał do tabel groups — granice ADR-002).
        await prisma.outboxEvent.create({
          data: {
            type: 'groups.membership_requested',
            payload: {
              groupId,
              requesterUserId: userId,
              moderatorUserIds: await moderatorUserIds(groupId),
            },
          },
        });
      }
      await cache?.bump(GROUPS_CACHE_NS); // liczba członków w listingu zmieniona
      return { status };
    },

    async approveMembership(moderatorUserId: string, membershipId: string) {
      const m = await prisma.groupMembership.findUnique({ where: { id: membershipId } });
      if (!m) throw new NotFoundError('Wniosek o członkostwo nie istnieje');
      const modMembership = await membership(moderatorUserId, m.groupId);
      if (
        !modMembership ||
        modMembership.role !== 'MODERATOR' ||
        modMembership.status !== 'ACTIVE'
      ) {
        throw new ForbiddenError('NOT_GROUP_MODERATOR', 'Wymagane uprawnienia moderatora grupy');
      }
      const result = await prisma.groupMembership.updateMany({
        where: { id: membershipId, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });
      if (result.count === 0) throw new ConflictError('NOT_PENDING', 'Wniosek nie jest oczekujący');
      await prisma.outboxEvent.create({
        data: {
          type: 'groups.membership_accepted',
          payload: { groupId: m.groupId, requesterUserId: m.userId },
        },
      });
      return { groupId: m.groupId, userId: m.userId };
    },

    async listPendingMemberships(moderatorUserId: string, groupId: string) {
      const mod = await membership(moderatorUserId, groupId);
      if (!mod || mod.role !== 'MODERATOR' || mod.status !== 'ACTIVE') {
        throw new ForbiddenError('NOT_GROUP_MODERATOR', 'Wymagane uprawnienia moderatora grupy');
      }
      const pending = await prisma.groupMembership.findMany({
        where: { groupId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      const users = await identity.getPublicUsers(pending.map((m) => m.userId));
      return pending.map((m) => ({
        membershipId: m.id,
        userId: m.userId,
        displayName: users.get(m.userId)?.displayName ?? 'Użytkownik',
        createdAt: m.createdAt,
      }));
    },

    async leave(userId: string, groupId: string) {
      const result = await prisma.groupMembership.deleteMany({ where: { groupId, userId } });
      if (result.count === 0) throw new NotFoundError('Nie jesteś członkiem tej grupy');
      await cache?.bump(GROUPS_CACHE_NS);
    },

    async createPost(userId: string, groupId: string, input: CreatePostInput) {
      await requireGroup(groupId);
      await requireActiveMembership(userId, groupId);
      // Limit publikacji dla świeżych kont (D7).
      await enforceFreshAccountQuota(
        redis,
        identity.getUserCreatedAt,
        userId,
        FRESH_ACCOUNT_LIMITS.group_post,
      );
      const result = await prisma.$transaction(async (tx) => {
        const post = await tx.post.create({
          data: {
            groupId,
            authorUserId: userId,
            type: input.type,
            title: input.title,
            body: input.body,
          },
        });
        await emitEvent(tx, 'groups.post_published', {
          postId: post.id,
          groupId,
          authorUserId: userId,
        });
        await emitMentions(tx, `${input.title}\n${input.body}`, userId, {
          groupId,
          postId: post.id,
        });
        return { id: post.id };
      });
      await cache?.bump(GROUPS_CACHE_NS); // liczba postów w listingu zmieniona
      return result;
    },

    async addComment(userId: string, postId: string, input: CreateCommentInput) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, groupId: true, authorUserId: true },
      });
      if (!post) throw new NotFoundError('Post nie istnieje');
      await requireActiveMembership(userId, post.groupId);

      if (input.parentId) {
        const parent = await prisma.comment.findUnique({
          where: { id: input.parentId },
          select: { postId: true, parentId: true },
        });
        if (!parent || parent.postId !== postId) {
          throw new DomainError(
            'INVALID_PARENT',
            'Komentarz nadrzędny nie należy do tego posta',
            400,
          );
        }
        // Wątkowanie 1 poziom (ADR-010): nie można odpowiadać na odpowiedź.
        if (parent.parentId) {
          throw new DomainError(
            'MAX_DEPTH',
            'Komentarze mają maksymalnie jeden poziom zagłębienia',
            400,
          );
        }
      }

      return prisma.$transaction(async (tx) => {
        const comment = await tx.comment.create({
          data: {
            postId,
            authorUserId: userId,
            parentId: input.parentId ?? null,
            body: input.body,
          },
        });
        await emitEvent(tx, 'groups.comment_added', {
          commentId: comment.id,
          postId,
          groupId: post.groupId,
          postAuthorUserId: post.authorUserId,
          actorUserId: userId,
        });
        await emitMentions(tx, input.body, userId, { groupId: post.groupId, postId });
        return { id: comment.id };
      });
    },

    async react(userId: string, postId: string) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { groupId: true },
      });
      if (!post) throw new NotFoundError('Post nie istnieje');
      await requireActiveMembership(userId, post.groupId);
      try {
        await prisma.reaction.create({ data: { postId, userId } });
      } catch (err: unknown) {
        // Unikat (postId, userId) → ponowna reakcja jest no-opem (idempotencja).
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          return { reacted: true };
        }
        throw err;
      }
      return { reacted: true };
    },

    async unreact(userId: string, postId: string) {
      await prisma.reaction.deleteMany({ where: { postId, userId } });
      return { reacted: false };
    },

    // --- odczyty --------------------------------------------------------------

    async listGroups(filters: {
      industryId?: string;
      q?: string;
      cursor?: string;
      limit?: number;
    }) {
      // Cache-aside (D3): listing publiczny, niezależny od widza. Bez cache
      // (część testów) → odczyt bezpośredni.
      if (!cache) return loadGroups(filters);
      return cache.getOrSet(GROUPS_CACHE_NS, filters, GROUPS_CACHE_TTL, () => loadGroups(filters));
    },

    async getGroup(groupId: string, viewerId: string | null) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { industry: true, _count: { select: { memberships: true, posts: true } } },
      });
      if (!group) throw new NotFoundError('Grupa nie istnieje');
      const viewerMembership = viewerId ? await membership(viewerId, groupId) : null;
      return {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          type: group.type,
          isSystem: group.isSystem,
          industry: group.industry ? { id: group.industry.id, name: group.industry.name } : null,
          membersCount: group._count.memberships,
          postsCount: group._count.posts,
        },
        viewer: {
          membershipStatus: viewerMembership?.status ?? null,
          role: viewerMembership?.role ?? null,
        },
      };
    },

    async getGroupFeed(
      groupId: string,
      viewerId: string | null,
      filters: { cursor?: string; limit?: number },
    ) {
      await requireGroup(groupId);
      const limit = filters.limit ?? FEED_PAGE_DEFAULT;
      // Feed chronologiczny (ADR-010): bez rankingu, paginacja kursorem.
      const rows = await prisma.post.findMany({
        where: { groupId, moderationStatus: 'VISIBLE', deletedAt: null },
        include: { _count: { select: { comments: true, reactions: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const authors = await identity.getPublicUsers(page.map((p) => p.authorUserId));
      const reactedSet = viewerId
        ? new Set(
            (
              await prisma.reaction.findMany({
                where: { userId: viewerId, postId: { in: page.map((p) => p.id) } },
                select: { postId: true },
              })
            ).map((r) => r.postId),
          )
        : new Set<string>();
      return {
        posts: page.map((p) => ({
          id: p.id,
          type: p.type,
          title: p.title,
          body: p.body,
          authorName: authors.get(p.authorUserId)?.displayName ?? 'Użytkownik',
          commentsCount: p._count.comments,
          reactionsCount: p._count.reactions,
          viewerReacted: reactedSet.has(p.id),
          createdAt: p.createdAt,
        })),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      };
    },

    async getPost(postId: string, viewerId: string | null) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          _count: { select: { reactions: true } },
          comments: { orderBy: { createdAt: 'asc' }, take: 500 },
        },
      });
      if (!post || post.moderationStatus !== 'VISIBLE' || post.deletedAt)
        throw new NotFoundError('Post nie istnieje');
      const userIds = [post.authorUserId, ...post.comments.map((c) => c.authorUserId)];
      const users = await identity.getPublicUsers(userIds);
      const viewerReacted = viewerId
        ? (await prisma.reaction.findUnique({
            where: { postId_userId: { postId, userId: viewerId } },
          })) !== null
        : false;
      return {
        post: {
          id: post.id,
          groupId: post.groupId,
          type: post.type,
          title: post.title,
          body: post.body,
          authorName: users.get(post.authorUserId)?.displayName ?? 'Użytkownik',
          reactionsCount: post._count.reactions,
          viewerReacted,
          isOwn: post.authorUserId === viewerId,
          editedAt: post.editedAt,
          createdAt: post.createdAt,
        },
        comments: post.comments.map((c) => ({
          id: c.id,
          parentId: c.parentId,
          body: c.deletedAt ? '[treść usunięta]' : c.body,
          authorName: users.get(c.authorUserId)?.displayName ?? 'Użytkownik',
          isOwn: c.authorUserId === viewerId,
          editedAt: c.editedAt,
          deletedAt: c.deletedAt,
          createdAt: c.createdAt,
        })),
      };
    },

    // --- Edycja/usuwanie WŁASNYCH treści (S4, soft delete) -------------------

    async updatePost(userId: string, postId: string, input: { title?: string; body?: string }) {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post || post.deletedAt) throw new NotFoundError('Post nie istnieje');
      if (post.authorUserId !== userId) throw new ForbiddenError();
      await prisma.post.update({
        where: { id: postId },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.body ? { body: input.body } : {}),
          editedAt: new Date(),
        },
      });
      return { id: postId };
    },

    async deletePost(userId: string, postId: string) {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post || post.deletedAt) throw new NotFoundError('Post nie istnieje');
      if (post.authorUserId !== userId) throw new ForbiddenError();
      await prisma.$transaction(async (tx) => {
        await tx.post.update({
          where: { id: postId },
          data: { deletedAt: new Date(), title: '[usunięto]', body: '[treść usunięta]' },
        });
        // Feed jest projekcją w module social — bez tego zdarzenia usunięty post
        // zostawał na osi aktywności z dawnym tytułem i linkiem prowadzącym w 404.
        await emitEvent(tx, 'groups.post_deleted', { postId, groupId: post.groupId });
      });
      await cache?.bump(GROUPS_CACHE_NS);
      return { id: postId };
    },

    async deleteComment(userId: string, commentId: string) {
      const comment = await prisma.comment.findUnique({ where: { id: commentId } });
      if (!comment || comment.deletedAt) throw new NotFoundError('Komentarz nie istnieje');
      if (comment.authorUserId !== userId) throw new ForbiddenError();
      await prisma.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date(), body: '[treść usunięta]' },
      });
      return { id: commentId };
    },
  };
}

export type GroupsService = ReturnType<typeof createGroupsService>;

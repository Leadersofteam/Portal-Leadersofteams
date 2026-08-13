import type {
  CreateSocialCommentInput,
  CreateSocialPostInput,
  FeedScope,
  UpdateSocialPostInput,
} from '@lot/contracts';
import type { Prisma } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import { DomainError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { emitEvent } from '../../shared/outbox';
import { toBooleanQuery } from '../../shared/fulltext';
import { extractMentions } from '../../shared/mentions';
import { enforceFreshAccountQuota, FRESH_ACCOUNT_LIMITS } from '../../shared/quota';
import type { Redis } from '../../shared/redis';
import type { IdentityService } from '../identity/index';
import type { LadderService } from '../ladder/index';

// Moduł social — „X-lite" w duchu ADR-010: obserwowanie + CHRONOLOGICZNY feed
// obserwowanych (kursor, „Wczytaj więcej"), publiczny profil @handle.
// Twarde granice: zero algorytmu, zero punktów (ladder nie zna zdarzeń social.*),
// zero DM (kontakt przez zapytania o usługi / wątki ofert).

export type ActivityType =
  | 'POST_PUBLISHED'
  | 'LISTING_PUBLISHED'
  | 'ANSWER_ACCEPTED'
  | 'LEVEL_ACHIEVED'
  | 'SOCIAL_POST_PUBLISHED';

export interface SocialDeps {
  prisma: PrismaClient;
  identity: Pick<
    IdentityService,
    | 'getPublicUsers'
    | 'ensureHandle'
    | 'getUserIdByHandle'
    | 'getUserIdsByHandles'
    | 'getUserCreatedAt'
  >;
  ladder: Pick<LadderService, 'getLevels'>;
  redis?: Redis;
}

const FEED_LIMIT = 20;

/**
 * Zdjęcie wpisu portalowego z obiegu. Wspólne dla usunięcia przez autora
 * i dla ukrycia przez moderatora (S12) — celowo JEDNA implementacja, bo dwie
 * kopie tej operacji rozjechałyby się przy pierwszej zmianie i zostawiłyby
 * sierotę w feedzie w jednej ze ścieżek.
 *
 * Feed jest projekcją: bez skasowania `ActivityItem` po ukrytym wpisie zostaje
 * kafelek linkujący w 404.
 */
export async function takeDownSocialPost(prisma: PrismaClient, postId: string): Promise<void> {
  await prisma.socialPost.update({
    where: { id: postId },
    data: { deletedAt: new Date(), body: '' },
  });
  await prisma.activityItem.deleteMany({
    where: { type: 'SOCIAL_POST_PUBLISHED', subjectId: postId },
  });
}

export function createSocialService({ prisma, identity, ladder, redis }: SocialDeps) {
  // Wzmianki @handle w treści wpisu/komentarza → powiadomienie dla wymienionego.
  // Payload niesie socialPostId (a nie groupId), więc powiadomienie linkuje
  // do permalinku wpisu zamiast lądować w ogólnej liście.
  async function emitMentions(
    tx: Parameters<typeof emitEvent>[0],
    body: string,
    authorUserId: string,
    socialPostId: string,
  ) {
    const handles = extractMentions(body);
    if (handles.length === 0) return;
    const ids = await identity.getUserIdsByHandles(handles);
    for (const mentionedId of ids.values()) {
      if (mentionedId === authorUserId) continue;
      await emitEvent(tx, 'social.user_mentioned', {
        mentionedUserId: mentionedId,
        authorUserId,
        socialPostId,
      });
    }
  }

  async function requireOwnPost(postId: string, userId: string) {
    const post = await prisma.socialPost.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorUserId: true },
    });
    if (!post) throw new NotFoundError('Wpis nie istnieje');
    if (post.authorUserId !== userId) {
      throw new ForbiddenError('NOT_OWNER', 'To nie jest Twój wpis');
    }
    return post;
  }

  return {
    async follow(userId: string, targetUserId: string) {
      if (userId === targetUserId) {
        throw new DomainError('SELF_FOLLOW', 'Nie można obserwować samego siebie', 400);
      }
      const target = await prisma.user.findFirst({
        where: { id: targetUserId, anonymizedAt: null },
        select: { id: true },
      });
      if (!target) throw new NotFoundError('Użytkownik nie istnieje');
      await prisma.follow.createMany({
        data: [{ followerId: userId, followedId: targetUserId }],
        skipDuplicates: true,
      });
      // Obserwowany dostaje uchwyt — jego profil staje się linkowalny w feedzie.
      await identity.ensureHandle(targetUserId);
      return { following: true };
    },

    async unfollow(userId: string, targetUserId: string) {
      await prisma.follow.deleteMany({
        where: { followerId: userId, followedId: targetUserId },
      });
      return { following: false };
    },

    async isFollowing(userId: string, targetUserId: string) {
      const row = await prisma.follow.findUnique({
        where: { followerId_followedId: { followerId: userId, followedId: targetUserId } },
      });
      return Boolean(row);
    },

    // --- wpisy portalowe (X-lite) --------------------------------------------

    async createPost(userId: string, input: CreateSocialPostInput) {
      await enforceFreshAccountQuota(
        redis,
        identity.getUserCreatedAt,
        userId,
        FRESH_ACCOUNT_LIMITS.social_post,
      );
      const result = await prisma.$transaction(async (tx) => {
        const post = await tx.socialPost.create({
          data: { authorUserId: userId, body: input.body },
        });
        await emitEvent(tx, 'social.post_published', { postId: post.id, authorUserId: userId });
        await emitMentions(tx, input.body, userId, post.id);
        return { id: post.id };
      });
      // Uchwyt musi istnieć, zanim wpis pojawi się w feedzie — inaczej autor
      // renderuje się bez linku do własnego profilu.
      await identity.ensureHandle(userId);
      return result;
    },

    async updatePost(userId: string, postId: string, input: UpdateSocialPostInput) {
      await requireOwnPost(postId, userId);
      await prisma.socialPost.update({
        where: { id: postId },
        data: { body: input.body, editedAt: new Date() },
      });
      return { id: postId };
    },

    async deletePost(userId: string, postId: string) {
      await requireOwnPost(postId, userId);
      await takeDownSocialPost(prisma, postId);
      return { id: postId };
    },

    async addComment(userId: string, postId: string, input: CreateSocialCommentInput) {
      const post = await prisma.socialPost.findFirst({
        where: { id: postId, deletedAt: null },
        select: { id: true, authorUserId: true },
      });
      if (!post) throw new NotFoundError('Wpis nie istnieje');

      if (input.parentId) {
        const parent = await prisma.socialComment.findUnique({
          where: { id: input.parentId },
          select: { postId: true, parentId: true },
        });
        if (!parent || parent.postId !== postId) {
          throw new DomainError(
            'INVALID_PARENT',
            'Komentarz nadrzędny nie należy do tego wpisu',
            400,
          );
        }
        if (parent.parentId) {
          throw new DomainError(
            'MAX_DEPTH',
            'Komentarze mają maksymalnie jeden poziom zagłębienia',
            400,
          );
        }
      }

      return prisma.$transaction(async (tx) => {
        const comment = await tx.socialComment.create({
          data: {
            postId,
            authorUserId: userId,
            parentId: input.parentId ?? null,
            body: input.body,
          },
        });
        await emitEvent(tx, 'social.comment_added', {
          commentId: comment.id,
          socialPostId: postId,
          postAuthorUserId: post.authorUserId,
          actorUserId: userId,
        });
        await emitMentions(tx, input.body, userId, postId);
        return { id: comment.id };
      });
    },

    async deleteComment(userId: string, commentId: string) {
      const comment = await prisma.socialComment.findUnique({
        where: { id: commentId },
        select: { id: true, authorUserId: true },
      });
      if (!comment) throw new NotFoundError('Komentarz nie istnieje');
      if (comment.authorUserId !== userId) {
        throw new ForbiddenError('NOT_OWNER', 'To nie jest Twój komentarz');
      }
      await prisma.socialComment.update({
        where: { id: commentId },
        data: { deletedAt: new Date(), body: '' },
      });
      return { id: commentId };
    },

    // „Doceniam" — jeden typ reakcji, zero punktów (ADR-004). Idempotentne
    // dzięki kluczowi złożonemu: ponowne kliknięcie nie mnoży wierszy.
    async appreciate(userId: string, postId: string) {
      const post = await prisma.socialPost.findFirst({
        where: { id: postId, deletedAt: null },
        select: { id: true },
      });
      if (!post) throw new NotFoundError('Wpis nie istnieje');
      try {
        await prisma.socialReaction.create({ data: { postId, userId } });
      } catch (err: unknown) {
        if (!(typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002')) {
          throw err;
        }
      }
      return { appreciated: true, count: await prisma.socialReaction.count({ where: { postId } }) };
    },

    async unappreciate(userId: string, postId: string) {
      await prisma.socialReaction.deleteMany({ where: { postId, userId } });
      return {
        appreciated: false,
        count: await prisma.socialReaction.count({ where: { postId } }),
      };
    },

    // Permalink wpisu — czytelny także dla gościa (treść jest publiczna).
    async getPost(postId: string, viewerId?: string) {
      const post = await prisma.socialPost.findFirst({
        where: { id: postId, deletedAt: null },
      });
      if (!post) throw new NotFoundError('Wpis nie istnieje');

      const comments = await prisma.socialComment.findMany({
        where: { postId },
        orderBy: [{ createdAt: 'asc' }],
        take: 200,
      });

      const userIds = [...new Set([post.authorUserId, ...comments.map((c) => c.authorUserId)])];
      const [users, levels, appreciations, mine] = await Promise.all([
        identity.getPublicUsers(userIds),
        ladder.getLevels(userIds),
        prisma.socialReaction.count({ where: { postId } }),
        viewerId
          ? prisma.socialReaction.findUnique({
              where: { postId_userId: { postId, userId: viewerId } },
            })
          : Promise.resolve(null),
      ]);

      const person = (id: string) => ({
        id,
        displayName: users.get(id)?.displayName ?? 'Użytkownik',
        handle: users.get(id)?.handle ?? null,
        avatarFileId: users.get(id)?.avatarFileId ?? null,
        level: levels.get(id) ?? 0,
      });

      return {
        post: {
          id: post.id,
          body: post.body,
          createdAt: post.createdAt,
          editedAt: post.editedAt,
          author: person(post.authorUserId),
          isOwn: viewerId === post.authorUserId,
          appreciations,
          viewerAppreciated: Boolean(mine),
        },
        comments: comments.map((c) => ({
          id: c.id,
          parentId: c.parentId,
          body: c.deletedAt ? '[treść usunięta]' : c.body,
          deleted: Boolean(c.deletedAt),
          createdAt: c.createdAt,
          author: person(c.authorUserId),
          isOwn: viewerId === c.authorUserId,
        })),
      };
    },

    // Chronologiczny feed (ADR-010: bez rankingu, bez infinite scroll — web
    // renderuje przycisk „Wczytaj więcej"). Dwa zakresy:
    //   following — oś obserwowanych (wymaga sesji),
    //   all       — cała społeczność, także dla gościa. ActivityItem niesie
    //               wyłącznie dane i tak publiczne, więc to nie jest nowy wyciek,
    //               a pusty rynek nie wybacza ekranu logowania na wejściu.
    async getFeed(
      userId: string | null,
      { scope = 'following' as FeedScope, cursor, limit = FEED_LIMIT } = {} as {
        scope?: FeedScope;
        cursor?: string;
        limit?: number;
      },
    ) {
      let followedIds: string[] = [];
      if (userId) {
        const following = await prisma.follow.findMany({
          where: { followerId: userId },
          select: { followedId: true },
        });
        followedIds = following.map((f) => f.followedId);
      }

      const empty = {
        items: [] as never[],
        nextCursor: null,
        followingCount: followedIds.length,
        scope,
      };
      if (scope === 'following' && followedIds.length === 0) return empty;

      const rows = await prisma.activityItem.findMany({
        where: scope === 'following' ? { actorId: { in: followedIds } } : {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      // Wpisy portalowe renderujemy z AKTUALNEJ treści, nie z meta zamrożonej
      // w chwili publikacji — inaczej edycja i usunięcie nie byłyby widoczne.
      const postIds = page
        .filter((r) => r.type === 'SOCIAL_POST_PUBLISHED')
        .map((r) => r.subjectId);
      const actorIds = [...new Set(page.map((r) => r.actorId))];
      const [users, levels, posts, reactionCounts, commentCounts] = await Promise.all([
        identity.getPublicUsers(actorIds),
        ladder.getLevels(actorIds),
        postIds.length
          ? prisma.socialPost.findMany({
              where: { id: { in: postIds }, deletedAt: null },
              select: { id: true, body: true, editedAt: true },
            })
          : Promise.resolve([]),
        postIds.length
          ? prisma.socialReaction.groupBy({
              by: ['postId'],
              where: { postId: { in: postIds } },
              _count: { postId: true },
            })
          : Promise.resolve([]),
        postIds.length
          ? prisma.socialComment.groupBy({
              by: ['postId'],
              where: { postId: { in: postIds }, deletedAt: null },
              _count: { postId: true },
            })
          : Promise.resolve([]),
      ]);

      const postById = new Map(posts.map((p) => [p.id, p]));
      const reactionsBy = new Map(reactionCounts.map((r) => [r.postId, r._count.postId]));
      const commentsBy = new Map(commentCounts.map((c) => [c.postId, c._count.postId]));

      return {
        items: page
          // Wpis usunięty tuż po pobraniu strony — nie pokazujemy pustego kafelka.
          .filter((r) => r.type !== 'SOCIAL_POST_PUBLISHED' || postById.has(r.subjectId))
          .map((r) => {
            const post = postById.get(r.subjectId);
            return {
              id: r.id,
              type: r.type,
              subjectId: r.subjectId,
              meta: (r.meta ?? {}) as Record<string, unknown>,
              createdAt: r.createdAt,
              ...(post
                ? {
                    post: {
                      body: post.body,
                      editedAt: post.editedAt,
                      appreciations: reactionsBy.get(post.id) ?? 0,
                      comments: commentsBy.get(post.id) ?? 0,
                    },
                  }
                : {}),
              actor: {
                id: r.actorId,
                displayName: users.get(r.actorId)?.displayName ?? 'Użytkownik',
                handle: users.get(r.actorId)?.handle ?? null,
                avatarFileId: users.get(r.actorId)?.avatarFileId ?? null,
                level: levels.get(r.actorId) ?? 0,
              },
            };
          }),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
        followingCount: followedIds.length,
        scope,
      };
    },

    // Wyszukiwanie wpisów portalowych (dla modułu search) — korzysta z indeksu
    // FULLTEXT social_posts(body) dodanego razem z encją.
    async searchPosts(q: string, limit = 10) {
      const expr = toBooleanQuery(q);
      const ids = expr
        ? (
            await prisma.$queryRaw<Array<{ id: string }>>`
              SELECT id FROM social_posts
              WHERE MATCH(body) AGAINST(${expr} IN BOOLEAN MODE)
                AND deletedAt IS NULL
              LIMIT 50`
          ).map((r) => r.id)
        : null;

      const rows = await prisma.socialPost.findMany({
        where: ids
          ? { id: { in: ids }, deletedAt: null }
          : { body: { contains: q }, deletedAt: null },
        select: { id: true, body: true, authorUserId: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
      });
      return rows.map((r) => ({
        id: r.id,
        excerpt: r.body.slice(0, 160),
        authorUserId: r.authorUserId,
        createdAt: r.createdAt,
      }));
    },

    // Publiczny profil społecznościowy: oś aktywności + liczniki obserwujących.
    async getPublicProfile(handle: string) {
      const userId = await identity.getUserIdByHandle(handle);
      if (!userId) throw new NotFoundError('Profil nie istnieje');
      const [users, levels, followers, following, activity, leaderProfile] = await Promise.all([
        identity.getPublicUsers([userId]),
        ladder.getLevels([userId]),
        prisma.follow.count({ where: { followedId: userId } }),
        prisma.follow.count({ where: { followerId: userId } }),
        prisma.activityItem.findMany({
          where: { actorId: userId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 30,
        }),
        prisma.leaderProfile.findFirst({
          where: { userId, isVisible: true },
          select: { id: true, headline: true },
        }),
      ]);
      const user = users.get(userId);
      if (!user) throw new NotFoundError('Profil nie istnieje');
      return {
        user: {
          id: userId,
          displayName: user.displayName,
          handle: user.handle,
          avatarFileId: user.avatarFileId,
          level: levels.get(userId) ?? 0,
        },
        leaderProfile,
        followers,
        following,
        activity: activity.map((a) => ({
          id: a.id,
          type: a.type,
          subjectId: a.subjectId,
          meta: (a.meta ?? {}) as Record<string, unknown>,
          createdAt: a.createdAt,
        })),
      };
    },

    async getMySocial(userId: string) {
      const handle = await identity.ensureHandle(userId);
      const [followers, following] = await Promise.all([
        prisma.follow.count({ where: { followedId: userId } }),
        prisma.follow.count({ where: { followerId: userId } }),
      ]);
      return { handle, followers, following };
    },

    // --- konsumenci zdarzeń (worker) — materializacja feedu -------------------

    async recordActivity(input: {
      actorId: string;
      type: ActivityType;
      subjectId: string;
      meta?: Record<string, unknown>;
    }) {
      await prisma.activityItem.createMany({
        data: [
          {
            actorId: input.actorId,
            type: input.type,
            subjectId: input.subjectId,
            meta: (input.meta ?? {}) as Prisma.InputJsonValue,
          },
        ],
        skipDuplicates: true, // unikat [type, subjectId] — konsument idempotentny
      });
    },

    async onPostPublished(p: { postId: string; groupId: string; authorUserId: string }) {
      const post = await prisma.post.findUnique({
        where: { id: p.postId },
        select: { title: true, deletedAt: true, group: { select: { name: true } } },
      });
      if (!post || post.deletedAt) return;
      await this.recordActivity({
        actorId: p.authorUserId,
        type: 'POST_PUBLISHED',
        subjectId: p.postId,
        meta: { title: post.title, groupId: p.groupId, groupName: post.group.name },
      });
    },

    async onListingPublished(p: { listingId: string; leaderUserId: string; title: string }) {
      const listing = await prisma.serviceListing.findUnique({
        where: { id: p.listingId },
        select: { slug: true, title: true },
      });
      await this.recordActivity({
        actorId: p.leaderUserId,
        type: 'LISTING_PUBLISHED',
        subjectId: p.listingId,
        meta: { title: listing?.title ?? p.title, slug: listing?.slug ?? null },
      });
    },

    async onAnswerAccepted(p: { answerId: string; threadId: string; answerAuthorUserId: string }) {
      const thread = await prisma.thread.findUnique({
        where: { id: p.threadId },
        select: { title: true },
      });
      await this.recordActivity({
        actorId: p.answerAuthorUserId,
        type: 'ANSWER_ACCEPTED',
        subjectId: p.answerId,
        meta: { threadId: p.threadId, threadTitle: thread?.title ?? null },
      });
    },

    async onSocialPostPublished(p: { postId: string; authorUserId: string }) {
      const post = await prisma.socialPost.findUnique({
        where: { id: p.postId },
        select: { body: true, deletedAt: true },
      });
      if (!post || post.deletedAt) return;
      await this.recordActivity({
        actorId: p.authorUserId,
        type: 'SOCIAL_POST_PUBLISHED',
        subjectId: p.postId,
        // Skrót tylko na potrzeby kart OG i powiadomień — feed czyta treść na żywo.
        meta: { excerpt: post.body.slice(0, 160) },
      });
    },

    // Post grupowy usunięty przez autora → sprzątamy jego ślad w feedzie.
    // Robi to social, nie groups: tabela activity_items należy do tego modułu
    // (ADR-002 — moduł czyści wyłącznie własne tabele).
    async onGroupPostDeleted(p: { postId: string }) {
      await prisma.activityItem.deleteMany({
        where: { type: 'POST_PUBLISHED', subjectId: p.postId },
      });
    },

    async onLevelAchieved(p: { userId: string; level: number; achievementId: string }) {
      await this.recordActivity({
        actorId: p.userId,
        type: 'LEVEL_ACHIEVED',
        subjectId: p.achievementId,
        meta: { level: p.level },
      });
    },

    // Analityka (S12): moduł liczy WŁASNĄ tabelę i oddaje samą liczbę (ADR-002).
    // Liczymy z bazy, a nie z licznika w Redisie — dane już tu są, więc licznik
    // byłby drugim, gorszym źródłem prawdy (ginie przy flushu, nie liczy wstecz).
    async countPostsBetween(from: Date, to: Date): Promise<number> {
      return prisma.socialPost.count({
        where: { createdAt: { gte: from, lt: to }, deletedAt: null },
      });
    },
  };
}

export type SocialService = ReturnType<typeof createSocialService>;

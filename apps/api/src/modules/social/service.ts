import type { Prisma } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import { DomainError, NotFoundError } from '../../shared/errors';
import type { IdentityService } from '../identity/index';
import type { LadderService } from '../ladder/index';

// Moduł social — „X-lite" w duchu ADR-010: obserwowanie + CHRONOLOGICZNY feed
// obserwowanych (kursor, „Wczytaj więcej"), publiczny profil @handle.
// Twarde granice: zero algorytmu, zero punktów (ladder nie zna zdarzeń social.*),
// zero DM (kontakt przez zapytania o usługi / wątki ofert).

export type ActivityType =
  'POST_PUBLISHED' | 'LISTING_PUBLISHED' | 'ANSWER_ACCEPTED' | 'LEVEL_ACHIEVED';

export interface SocialDeps {
  prisma: PrismaClient;
  identity: Pick<IdentityService, 'getPublicUsers' | 'ensureHandle' | 'getUserIdByHandle'>;
  ladder: Pick<LadderService, 'getLevels'>;
}

const FEED_LIMIT = 20;

export function createSocialService({ prisma, identity, ladder }: SocialDeps) {
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

    // Chronologiczny feed obserwowanych (ADR-010: bez rankingu, bez infinite
    // scroll — web renderuje przycisk „Wczytaj więcej").
    async getFeed(userId: string, cursor?: string, limit = FEED_LIMIT) {
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followedId: true },
      });
      const followedIds = following.map((f) => f.followedId);
      if (followedIds.length === 0) return { items: [], nextCursor: null, followingCount: 0 };

      const rows = await prisma.activityItem.findMany({
        where: { actorId: { in: followedIds } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      const actorIds = [...new Set(page.map((r) => r.actorId))];
      const [users, levels] = await Promise.all([
        identity.getPublicUsers(actorIds),
        ladder.getLevels(actorIds),
      ]);
      return {
        items: page.map((r) => ({
          id: r.id,
          type: r.type,
          subjectId: r.subjectId,
          meta: (r.meta ?? {}) as Record<string, unknown>,
          createdAt: r.createdAt,
          actor: {
            id: r.actorId,
            displayName: users.get(r.actorId)?.displayName ?? 'Użytkownik',
            handle: users.get(r.actorId)?.handle ?? null,
            avatarFileId: users.get(r.actorId)?.avatarFileId ?? null,
            level: levels.get(r.actorId) ?? 0,
          },
        })),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
        followingCount: followedIds.length,
      };
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

    async onLevelAchieved(p: { userId: string; level: number; achievementId: string }) {
      await this.recordActivity({
        actorId: p.userId,
        type: 'LEVEL_ACHIEVED',
        subjectId: p.achievementId,
        meta: { level: p.level },
      });
    },
  };
}

export type SocialService = ReturnType<typeof createSocialService>;

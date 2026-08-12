import type { CreateAnswerInput, CreateThreadInput, ThreadFilters } from '@lot/contracts';
import type { Prisma } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import { DomainError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { emitEvent } from '../../shared/outbox';
import { extractMentions } from '../../shared/mentions';
import { enforceFreshAccountQuota, FRESH_ACCOUNT_LIMITS } from '../../shared/quota';
import type { Redis } from '../../shared/redis';
import type { GroupsService } from '../groups/index';
import type { IdentityService } from '../identity/index';

// Moduł community NIE zawiera logiki punktowej — emituje wyłącznie zdarzenia
// community.*, a naliczanie punktów żyje w ladder (jedyny punkt audytu anty-MLM,
// ADR-004). Członkostwo w grupie czytamy przez publiczne API groups (ADR-002).
export interface CommunityServiceDeps {
  prisma: PrismaClient;
  identity: Pick<IdentityService, 'getPublicUsers' | 'getUserCreatedAt' | 'getUserIdsByHandles'>;
  groups: Pick<GroupsService, 'isActiveMember'>;
  redis?: Redis;
}

const PAGE_DEFAULT = 20;

export function createCommunityService({ prisma, identity, groups, redis }: CommunityServiceDeps) {
  async function requireMembership(userId: string, groupId: string) {
    if (!(await groups.isActiveMember(userId, groupId))) {
      throw new ForbiddenError('NOT_GROUP_MEMBER', 'Musisz być członkiem grupy');
    }
  }

  async function requireThread(threadId: string) {
    const thread = await prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundError('Wątek nie istnieje');
    return thread;
  }

  // Własna aktywność Q&A wyborcy (pytania + odpowiedzi) — próg kwalifikacji
  // głosu rozstrzyga ladder; tu tylko liczymy fakt aktywności.
  async function activityCount(userId: string): Promise<number> {
    const [threads, answers] = await Promise.all([
      prisma.thread.count({ where: { authorUserId: userId } }),
      prisma.answer.count({ where: { authorUserId: userId } }),
    ]);
    return threads + answers;
  }

  // Wzmianki @handle → zdarzenie dla notifications (zero punktów).
  async function emitMentions(
    tx: Parameters<typeof emitEvent>[0],
    body: string,
    authorUserId: string,
    context: { threadId: string },
  ) {
    const handles = extractMentions(body);
    if (handles.length === 0) return;
    const ids = await identity.getUserIdsByHandles(handles);
    for (const mentionedId of ids.values()) {
      if (mentionedId === authorUserId) continue;
      await emitEvent(tx, 'community.user_mentioned', {
        mentionedUserId: mentionedId,
        authorUserId,
        ...context,
      });
    }
  }

  return {
    async askQuestion(userId: string, groupId: string, input: CreateThreadInput) {
      await requireMembership(userId, groupId);
      await enforceFreshAccountQuota(
        redis,
        identity.getUserCreatedAt,
        userId,
        FRESH_ACCOUNT_LIMITS.qa_thread,
      );
      return prisma.$transaction(async (tx) => {
        const thread = await tx.thread.create({
          data: { groupId, authorUserId: userId, title: input.title, body: input.body },
        });
        await emitEvent(tx, 'community.thread_created', {
          threadId: thread.id,
          groupId,
          authorUserId: userId,
        });
        await emitMentions(tx, `${input.title}\n${input.body}`, userId, { threadId: thread.id });
        return { id: thread.id };
      });
    },

    async answer(userId: string, threadId: string, input: CreateAnswerInput) {
      const thread = await requireThread(threadId);
      await requireMembership(userId, thread.groupId);
      if (thread.status === 'CLOSED') {
        throw new DomainError('THREAD_CLOSED', 'Wątek jest zamknięty', 409);
      }
      await enforceFreshAccountQuota(
        redis,
        identity.getUserCreatedAt,
        userId,
        FRESH_ACCOUNT_LIMITS.qa_answer,
      );
      return prisma.$transaction(async (tx) => {
        const answer = await tx.answer.create({
          data: { threadId, authorUserId: userId, body: input.body },
        });
        await emitEvent(tx, 'community.answer_created', {
          answerId: answer.id,
          threadId,
          threadAuthorUserId: thread.authorUserId,
          answerAuthorUserId: userId,
          groupId: thread.groupId,
        });
        await emitMentions(tx, input.body, userId, { threadId });
        return { id: answer.id };
      });
    },

    // Akceptacja odpowiedzi przez autora pytania → community.answer_accepted →
    // ladder nalicza ANSWER_ACCEPTED. Nie można zaakceptować własnej odpowiedzi.
    async acceptAnswer(userId: string, answerId: string) {
      const answer = await prisma.answer.findUnique({
        where: { id: answerId },
        include: { thread: true },
      });
      if (!answer) throw new NotFoundError('Odpowiedź nie istnieje');
      const thread = answer.thread;
      if (thread.authorUserId !== userId) {
        throw new ForbiddenError(
          'NOT_THREAD_AUTHOR',
          'Tylko autor pytania może zaakceptować odpowiedź',
        );
      }
      if (answer.authorUserId === userId) {
        throw new DomainError(
          'CANNOT_ACCEPT_OWN',
          'Nie możesz zaakceptować własnej odpowiedzi',
          400,
        );
      }
      if (thread.status === 'CLOSED') {
        throw new DomainError('THREAD_CLOSED', 'Wątek jest zamknięty', 409);
      }
      // Idempotencja akcji: ponowna akceptacja tej samej odpowiedzi to no-op
      // (bez ponownej emisji — ladder i tak dedupuje po unikacie ledgera).
      if (thread.acceptedAnswerId === answerId) {
        return { answerId, alreadyAccepted: true };
      }
      await prisma.$transaction(async (tx) => {
        // Jedna zaakceptowana odpowiedź na wątek: zdejmij poprzednią.
        if (thread.acceptedAnswerId) {
          await tx.answer.update({
            where: { id: thread.acceptedAnswerId },
            data: { isAccepted: false },
          });
        }
        await tx.answer.update({ where: { id: answerId }, data: { isAccepted: true } });
        await tx.thread.update({
          where: { id: thread.id },
          data: { status: 'ANSWERED', acceptedAnswerId: answerId },
        });
        await emitEvent(tx, 'community.answer_accepted', {
          answerId,
          threadId: thread.id,
          answerAuthorUserId: answer.authorUserId,
          questionAuthorUserId: thread.authorUserId,
          groupId: thread.groupId,
        });
      });
      return { answerId, alreadyAccepted: false };
    },

    // Upvote „doceniam odpowiedź" → community.answer_upvoted → ladder nalicza
    // ANSWER_UPVOTED_QUALIFIED PO kwalifikacji wyborcy. Unikat = idempotencja.
    async voteAnswer(userId: string, answerId: string) {
      const answer = await prisma.answer.findUnique({
        where: { id: answerId },
        include: { thread: { select: { groupId: true } } },
      });
      if (!answer) throw new NotFoundError('Odpowiedź nie istnieje');
      await requireMembership(userId, answer.thread.groupId);
      if (answer.authorUserId === userId) {
        throw new DomainError('CANNOT_VOTE_OWN', 'Nie możesz głosować na własną odpowiedź', 400);
      }
      // Dane wyborcy do kwalifikacji (decyzja punktowa w ladder — ADR-004).
      const [createdAt, activity] = await Promise.all([
        identity.getUserCreatedAt(userId),
        activityCount(userId),
      ]);
      try {
        await prisma.$transaction(async (tx) => {
          const vote = await tx.answerVote.create({ data: { answerId, userId } });
          await emitEvent(tx, 'community.answer_upvoted', {
            voteId: vote.id,
            answerId,
            answerAuthorUserId: answer.authorUserId,
            voterUserId: userId,
            groupId: answer.thread.groupId,
            voterAccountCreatedAt: (createdAt ?? new Date()).toISOString(),
            voterActivityCount: activity,
          });
        });
      } catch (err: unknown) {
        // Unikat (answerId, userId) → ponowny głos jest no-opem (idempotencja).
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          return { voted: true };
        }
        throw err;
      }
      return { voted: true };
    },

    // --- odczyty --------------------------------------------------------------
    async listThreads(groupId: string, filters: ThreadFilters) {
      const limit = filters.limit ?? PAGE_DEFAULT;
      const where: Prisma.ThreadWhereInput = {
        groupId,
        ...(filters.status ? { status: filters.status } : {}),
      };
      // Feed chronologiczny (ADR-010): bez rankingu algorytmicznego.
      const rows = await prisma.thread.findMany({
        where,
        include: { _count: { select: { answers: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const authors = await identity.getPublicUsers(page.map((t) => t.authorUserId));
      return {
        threads: page.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          authorName: authors.get(t.authorUserId)?.displayName ?? 'Użytkownik',
          answersCount: t._count.answers,
          hasAcceptedAnswer: t.acceptedAnswerId !== null,
          createdAt: t.createdAt,
        })),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      };
    },

    async getThread(threadId: string, viewerId: string | null) {
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
          answers: {
            include: { _count: { select: { votes: true } } },
            orderBy: [{ isAccepted: 'desc' }, { createdAt: 'asc' }],
            take: 500,
          },
        },
      });
      if (!thread) throw new NotFoundError('Wątek nie istnieje');
      const userIds = [thread.authorUserId, ...thread.answers.map((a) => a.authorUserId)];
      const users = await identity.getPublicUsers(userIds);
      const votedSet = viewerId
        ? new Set(
            (
              await prisma.answerVote.findMany({
                where: { userId: viewerId, answerId: { in: thread.answers.map((a) => a.id) } },
                select: { answerId: true },
              })
            ).map((v) => v.answerId),
          )
        : new Set<string>();
      return {
        thread: {
          id: thread.id,
          groupId: thread.groupId,
          title: thread.title,
          body: thread.body,
          status: thread.status,
          authorUserId: thread.authorUserId,
          authorName: users.get(thread.authorUserId)?.displayName ?? 'Użytkownik',
          acceptedAnswerId: thread.acceptedAnswerId,
          createdAt: thread.createdAt,
        },
        answers: thread.answers.map((a) => ({
          id: a.id,
          body: a.body,
          authorName: users.get(a.authorUserId)?.displayName ?? 'Użytkownik',
          isAccepted: a.isAccepted,
          votesCount: a._count.votes,
          viewerVoted: votedSet.has(a.id),
          isOwn: viewerId ? a.authorUserId === viewerId : false,
          createdAt: a.createdAt,
        })),
      };
    },
  };
}

export type CommunityService = ReturnType<typeof createCommunityService>;

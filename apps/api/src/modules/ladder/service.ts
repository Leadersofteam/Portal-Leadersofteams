import type { Prisma } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import { DomainError, NotFoundError } from '../../shared/errors';
import { emitEvent } from '../../shared/outbox';
import {
  ANSWER_ACCEPTED_POINTS,
  ANSWER_UPVOTED_POINTS,
  COMMUNITY_WEEKLY_CAP,
  COMMUNITY_WINDOW_DAYS,
  COUNTERPARTY_WINDOW_DAYS,
  LEVELS,
  MATURATION_DAYS,
  NEW_COMPANY_AGE_DAYS,
  NEW_COMPANY_WEIGHT,
  RULESET_VERSION,
  VOTER_MIN_ACCOUNT_AGE_DAYS,
  VOTER_MIN_ACTIVITY,
  basePointsForRating,
  computeLevel,
  diminishingWeight,
  pathForType,
} from './rules';

export interface ReviewPublishedPayload {
  reviewId: string;
  orderId: string;
  direction: 'COMPANY_TO_LEADER' | 'LEADER_TO_COMPANY';
  rating: number;
  authorUserId: string;
  leaderUserId: string | null;
  companyId: string;
  companyCreatedAt: string;
  publishedAt: string;
}

// Zdarzenia ścieżki community (emitowane przez moduł community). Punkty płyną
// z uznania drugiego człowieka: autora pytania (accept) i innego Lidera (upvote).
export interface AnswerAcceptedPayload {
  answerId: string;
  answerAuthorUserId: string;
  questionAuthorUserId: string;
  groupId: string;
}

export interface AnswerUpvotedPayload {
  voteId: string;
  answerId: string;
  answerAuthorUserId: string;
  voterUserId: string;
  groupId: string;
  // dane wyborcy do kwalifikacji (decyzja punktowa w ladder — ADR-004)
  voterAccountCreatedAt: string;
  voterActivityCount: number;
}

const COMMUNITY_TYPES = ['ANSWER_ACCEPTED', 'ANSWER_UPVOTED_QUALIFIED'] as const;

export function createLadderService(prisma: PrismaClient) {
  // Projekcja LadderState z ledgera (tylko CONFIRMED). Wywoływana w tx,
  // sekwencyjnie per user (dispatcher outbox jest jednowątkowy per proces).
  async function recalcUser(tx: Prisma.TransactionClient, userId: string, now: Date) {
    const events = await tx.pointEvent.findMany({
      where: { userId, status: 'CONFIRMED' },
      select: { type: true, points: true },
    });
    let marketplacePoints = 0;
    let communityPoints = 0;
    for (const event of events) {
      if (pathForType(event.type) === 'marketplace') marketplacePoints += event.points;
      else communityPoints += event.points;
    }
    const previous = await tx.ladderState.findUnique({ where: { userId } });
    const level = computeLevel(marketplacePoints, communityPoints);
    // Poziom raz zdobyty nie wygasa (brief 6) — projekcja nie obniża poziomu
    // poniżej osiągniętego, chyba że korekta moderacyjna cofa punkty poniżej
    // progu (wtedy poziom spada — zgodnie z ADR-004 sporne przypadki
    // rozstrzyga moderator, a app dostaje korektę przez synchronizację).
    const effectiveLevel = Math.max(level, 0);

    await tx.ladderState.upsert({
      where: { userId },
      update: {
        marketplacePoints,
        communityPoints,
        totalPoints: marketplacePoints + communityPoints,
        level: effectiveLevel,
        isLeader: effectiveLevel >= 1,
        rulesetVersion: RULESET_VERSION,
      },
      create: {
        userId,
        marketplacePoints,
        communityPoints,
        totalPoints: marketplacePoints + communityPoints,
        level: effectiveLevel,
        isLeader: effectiveLevel >= 1,
        rulesetVersion: RULESET_VERSION,
      },
    });

    const previousLevel = previous?.level ?? 0;
    for (let lvl = previousLevel + 1; lvl <= effectiveLevel; lvl++) {
      // unique(userId, level) czyni awans idempotentnym
      const achievement = await tx.levelAchievement.upsert({
        where: { userId_level: { userId, level: lvl } },
        update: {},
        create: { userId, level: lvl, achievedAt: now },
      });
      await emitEvent(tx, 'ladder.level_achieved', {
        achievementId: achievement.id,
        userId,
        level: lvl,
        achievedAt: now.toISOString(),
      });
    }
  }

  // Wspólny naliczacz ścieżki community: malejące zwroty od uznającego + limit
  // tygodniowy. Wpis ledgera powstaje ZAWSZE (nawet 0 pkt przy przekroczeniu
  // limitu) z pełnym wyjaśnieniem w meta — transparentność „za co i ile" (ADR-004).
  async function awardCommunityPoint(args: {
    type: 'ANSWER_ACCEPTED' | 'ANSWER_UPVOTED_QUALIFIED';
    base: number;
    earnerUserId: string;
    recognizerUserId: string;
    sourceType: string;
    sourceId: string;
    reason: string;
    now: Date;
  }) {
    const { type, base, earnerUserId, recognizerUserId, sourceType, sourceId, reason, now } = args;

    // Malejące zwroty od tego samego uznającego (ADR-004) — jak marketplace,
    // ale kontrahentem jest userId uznającego (autor pytania / wyborca).
    const cpWindowStart = new Date(now.getTime() - COUNTERPARTY_WINDOW_DAYS * 86_400_000);
    const previousCount = await prisma.pointEvent.count({
      where: {
        userId: earnerUserId,
        type: { in: [...COMMUNITY_TYPES] },
        counterpartyId: recognizerUserId,
        status: { not: 'REVERSED' },
        createdAt: { gte: cpWindowStart },
      },
    });
    const repeatWeight = diminishingWeight(previousCount);
    const pointsAfterWeight = Math.round(base * repeatWeight);

    // Limit tygodniowy ścieżki community: suma punktów usera w oknie kroczącym.
    const weekStart = new Date(now.getTime() - COMMUNITY_WINDOW_DAYS * 86_400_000);
    const weekAgg = await prisma.pointEvent.aggregate({
      where: {
        userId: earnerUserId,
        type: { in: [...COMMUNITY_TYPES] },
        status: { not: 'REVERSED' },
        createdAt: { gte: weekStart },
      },
      _sum: { points: true },
    });
    const weekSum = weekAgg._sum.points ?? 0;
    const remaining = Math.max(0, COMMUNITY_WEEKLY_CAP - weekSum);
    const points = Math.min(pointsAfterWeight, remaining);
    const capApplied = points < pointsAfterWeight;

    try {
      const event = await prisma.pointEvent.create({
        data: {
          userId: earnerUserId,
          type,
          points,
          weightApplied: repeatWeight,
          meta: {
            basePoints: base,
            repeatWeight,
            repeatCount: previousCount,
            weeklyCap: COMMUNITY_WEEKLY_CAP,
            weeklySumBefore: weekSum,
            capApplied,
            explanation:
              `${reason}: ${base} pkt bazowych` +
              (repeatWeight < 1
                ? `; ${previousCount + 1}. uznanie od tej samej osoby → waga ${repeatWeight}`
                : '') +
              (capApplied
                ? `; tygodniowy limit community ${COMMUNITY_WEEKLY_CAP} pkt → przyznano ${points} pkt`
                : ''),
          },
          sourceType,
          sourceId,
          grantedByUserId: recognizerUserId,
          counterpartyId: recognizerUserId,
          rulesetVersion: RULESET_VERSION,
          createdAt: now,
        },
      });
      // Sygnał dla antifraud: detektory community (limit dobowy, wzajemna
      // adoracja) biegną w oknie karencji — patrz modules/antifraud.
      await prisma.outboxEvent.create({
        data: {
          type: 'ladder.point_pending_created',
          payload: {
            pointEventId: event.id,
            userId: earnerUserId,
            counterpartyId: recognizerUserId,
            kind: 'community',
          },
        },
      });
      return event;
    } catch (err: unknown) {
      // unique(type, sourceId, userId) — redelivery zdarzenia jest no-opem.
      if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
        return null;
      }
      throw err;
    }
  }

  return {
    // --- odczyty ------------------------------------------------------------
    async getLevel(userId: string): Promise<number> {
      const state = await prisma.ladderState.findUnique({ where: { userId } });
      return state?.level ?? 0;
    },

    // Wsadowy odczyt poziomów (projekcja) — do wzbogacania publicznych listingów
    // (np. katalog Liderów). Czysty odczyt LadderState, bez logiki punktowej.
    async getLevels(userIds: string[]): Promise<Map<string, number>> {
      if (userIds.length === 0) return new Map();
      const states = await prisma.ladderState.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, level: true },
      });
      return new Map(states.map((s) => [s.userId, s.level]));
    },

    // Publiczna oś awansów (PL3 „Droga Lidera"): kiedy Lider wszedł na który
    // szczebel. To projekcja LevelAchievement — dane, które i tak są jawne
    // przez poziom na profilu; daty czynią z poziomu OPOWIEŚĆ, nie etykietę.
    // Bez punktów i bez księgi: te zostają prywatne (/panel/punkty).
    async getAchievements(userId: string): Promise<Array<{ level: number; achievedAt: Date }>> {
      const rows = await prisma.levelAchievement.findMany({
        where: { userId },
        orderBy: { level: 'asc' },
        select: { level: true, achievedAt: true },
      });
      return rows;
    },

    async getMyLadder(userId: string) {
      const state = await prisma.ladderState.findUnique({ where: { userId } });
      const level = state?.level ?? 0;
      const marketplacePoints = state?.marketplacePoints ?? 0;
      const communityPoints = state?.communityPoints ?? 0;
      const nextRule = LEVELS.find((l) => l.level === level + 1) ?? null;
      // Transparentność (ADR-004): pełny ledger z metadanymi wag — bez cache.
      const events = await prisma.pointEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return {
        state: {
          level,
          levelName: LEVELS.find((l) => l.level === level)?.name ?? null,
          isLeader: level >= 1,
          marketplacePoints,
          communityPoints,
          totalPoints: marketplacePoints + communityPoints,
          rulesetVersion: RULESET_VERSION,
        },
        nextLevel: nextRule
          ? {
              level: nextRule.level,
              name: nextRule.name,
              pointsRequired: nextRule.pointsRequired,
              missingPoints: Math.max(
                0,
                nextRule.pointsRequired - (marketplacePoints + communityPoints),
              ),
              minPathSharePct: nextRule.minPathSharePct,
            }
          : null,
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          points: e.points,
          weightApplied: e.weightApplied,
          status: e.status,
          meta: e.meta,
          createdAt: e.createdAt,
          confirmedAt: e.confirmedAt,
        })),
      };
    },

    async listLevels() {
      return prisma.levelDefinition.findMany({
        where: { rulesetVersion: RULESET_VERSION },
        orderBy: { level: 'asc' },
      });
    },

    // --- naliczanie (konsument zdarzeń marketplace.*) -------------------------
    // Punkty wyłącznie z uznania drugiego człowieka: ocena Firmy za zlecenie.
    async handleReviewPublished(payload: ReviewPublishedPayload, now = new Date()) {
      if (payload.direction !== 'COMPANY_TO_LEADER' || !payload.leaderUserId) return null;

      const userId = payload.leaderUserId;
      const base = basePointsForRating(payload.rating);

      // Malejące zwroty: wcześniejsze punktowane zlecenia od tej samej firmy.
      const windowStart = new Date(now.getTime() - COUNTERPARTY_WINDOW_DAYS * 86_400_000);
      const previousCount = await prisma.pointEvent.count({
        where: {
          userId,
          type: 'ORDER_COMPLETED_RATED',
          counterpartyId: payload.companyId,
          status: { not: 'REVERSED' },
          createdAt: { gte: windowStart },
        },
      });
      const repeatWeight = diminishingWeight(previousCount);

      // Próg dojrzałości firmy: oceny od świeżych kont ważą mniej.
      const companyAgeDays =
        (now.getTime() - new Date(payload.companyCreatedAt).getTime()) / 86_400_000;
      const maturityWeight = companyAgeDays < NEW_COMPANY_AGE_DAYS ? NEW_COMPANY_WEIGHT : 1;

      const weight = repeatWeight * maturityWeight;
      const points = Math.round(base * weight);

      try {
        const event = await prisma.pointEvent.create({
          data: {
            userId,
            type: 'ORDER_COMPLETED_RATED',
            points,
            weightApplied: weight,
            meta: {
              basePoints: base,
              rating: payload.rating,
              repeatWeight,
              repeatCount: previousCount,
              maturityWeight,
              explanation:
                `Ocena ${payload.rating}/5 za zlecenie: ${base} pkt bazowych` +
                (repeatWeight < 1
                  ? `; ${previousCount + 1}. zlecenie od tej samej firmy → waga ${repeatWeight}`
                  : '') +
                (maturityWeight < 1
                  ? `; firma młodsza niż ${NEW_COMPANY_AGE_DAYS} dni → waga ${maturityWeight}`
                  : ''),
            },
            sourceType: 'Review',
            sourceId: payload.reviewId,
            grantedByUserId: payload.authorUserId,
            counterpartyId: payload.companyId,
            rulesetVersion: RULESET_VERSION,
            createdAt: now,
          },
        });
        await prisma.outboxEvent.create({
          data: {
            type: 'ladder.point_pending_created',
            payload: {
              pointEventId: event.id,
              userId,
              counterpartyId: payload.companyId,
              orderId: payload.orderId,
            },
          },
        });
        return event;
      } catch (err: unknown) {
        // unique(type, sourceId, userId) — redelivery zdarzenia jest no-opem.
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          return null;
        }
        throw err;
      }
    },

    // --- naliczanie (konsument zdarzeń community.*) ---------------------------
    // DRUGA, równoważna ścieżka awansu (brief 3.3). Punkty wyłącznie z uznania
    // drugiego człowieka: zaakceptowana odpowiedź i kwalifikowany upvote.
    // Wspólny naliczacz: malejące zwroty od uznającego + limit tygodniowy +
    // idempotencja przez unikat ledgera; wpis powstaje ZAWSZE (transparentność).
    async handleAnswerAccepted(payload: AnswerAcceptedPayload, now = new Date()) {
      // Autor pytania nie punktuje własnej odpowiedzi (blokada też w domenie).
      if (payload.answerAuthorUserId === payload.questionAuthorUserId) return null;
      return awardCommunityPoint({
        type: 'ANSWER_ACCEPTED',
        base: ANSWER_ACCEPTED_POINTS,
        earnerUserId: payload.answerAuthorUserId,
        recognizerUserId: payload.questionAuthorUserId,
        sourceType: 'Answer',
        sourceId: payload.answerId,
        reason: 'Odpowiedź zaakceptowana przez autora pytania',
        now,
      });
    },

    async handleAnswerUpvoted(payload: AnswerUpvotedPayload, now = new Date()) {
      // Wyborca nie punktuje własnej odpowiedzi.
      if (payload.answerAuthorUserId === payload.voterUserId) return null;
      // Kwalifikacja głosu (ADR-004): konto dojrzałe ORAZ własna aktywność.
      // Niekwalifikowany głos = 0 punktów i ŻADNEGO wpisu (jak w specyfikacji).
      const ageDays =
        (now.getTime() - new Date(payload.voterAccountCreatedAt).getTime()) / 86_400_000;
      const qualified =
        ageDays >= VOTER_MIN_ACCOUNT_AGE_DAYS && payload.voterActivityCount >= VOTER_MIN_ACTIVITY;
      if (!qualified) return null;
      return awardCommunityPoint({
        type: 'ANSWER_UPVOTED_QUALIFIED',
        base: ANSWER_UPVOTED_POINTS,
        earnerUserId: payload.answerAuthorUserId,
        recognizerUserId: payload.voterUserId,
        sourceType: 'AnswerVote',
        sourceId: payload.voteId,
        reason: 'Kwalifikowany upvote odpowiedzi',
        now,
      });
    },

    // --- dojrzewanie (job okresowy) -------------------------------------------
    // Okno karencji (ADR-004): awans wyłącznie z punktów CONFIRMED.
    async maturePendingPoints(now = new Date()): Promise<number> {
      const matureBefore = new Date(now.getTime() - MATURATION_DAYS * 86_400_000);
      const due = await prisma.pointEvent.findMany({
        where: { status: 'PENDING', createdAt: { lte: matureBefore } },
        select: { id: true, userId: true },
        take: 500,
      });
      const userIds = [...new Set(due.map((e) => e.userId))];
      for (const userId of userIds) {
        await prisma.$transaction(async (tx) => {
          await tx.pointEvent.updateMany({
            where: { userId, status: 'PENDING', createdAt: { lte: matureBefore } },
            data: { status: 'CONFIRMED', confirmedAt: now },
          });
          await recalcUser(tx, userId, now);
        });
      }
      return due.length;
    },

    // --- interwencje (publiczne API dla antifraud/moderacji) -------------------
    async holdPointEvent(pointEventId: string, reason: string) {
      const result = await prisma.pointEvent.updateMany({
        where: { id: pointEventId, status: 'PENDING' },
        data: { status: 'HOLD' },
      });
      if (result.count === 0) {
        throw new DomainError('CANNOT_HOLD', 'Punkt nie jest w statusie PENDING', 409);
      }
      return { pointEventId, reason };
    },

    async releasePointEvent(pointEventId: string) {
      const result = await prisma.pointEvent.updateMany({
        where: { id: pointEventId, status: 'HOLD' },
        data: { status: 'PENDING' },
      });
      if (result.count === 0) throw new NotFoundError('Punkt nie jest wstrzymany');
    },

    async reversePointEvent(
      pointEventId: string,
      moderatorId: string,
      reason: string,
      now = new Date(),
    ) {
      const event = await prisma.pointEvent.findUnique({ where: { id: pointEventId } });
      if (!event) throw new NotFoundError('Wpis punktowy nie istnieje');
      await prisma.$transaction(async (tx) => {
        if (event.status === 'CONFIRMED') {
          // Append-only: korekta = nowy ujemny wpis, oryginał nietknięty.
          await tx.pointEvent.create({
            data: {
              userId: event.userId,
              type: 'ADJUSTMENT_MODERATION',
              points: -event.points,
              weightApplied: 1,
              meta: { explanation: reason, reversedEventId: event.id },
              sourceType: 'ModerationCase',
              sourceId: pointEventId,
              grantedByUserId: moderatorId,
              status: 'CONFIRMED',
              reversalOfId: event.id,
              rulesetVersion: RULESET_VERSION,
              createdAt: now,
              confirmedAt: now,
            },
          });
        } else {
          await tx.pointEvent.update({
            where: { id: pointEventId },
            data: { status: 'REVERSED' },
          });
        }
        await recalcUser(tx, event.userId, now);
      });
    },
  };
}

export type LadderService = ReturnType<typeof createLadderService>;

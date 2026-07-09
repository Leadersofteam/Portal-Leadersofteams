import type { ModerationResolveInput } from '@lot/contracts';

import type { PrismaClient } from '../../shared/db';
import { NotFoundError } from '../../shared/errors';
import type { LadderService } from '../ladder/index';

export interface PointPendingPayload {
  pointEventId: string;
  userId: string;
  counterpartyId: string | null;
  orderId?: string;
  // Dyskryminator ścieżki: brak/'marketplace' → detektory zleceń; 'community'
  // → detektory Q&A (limit dobowy + wzajemna adoracja). Ustawiany przez ladder.
  kind?: 'marketplace' | 'community';
}

export interface AntifraudDeps {
  prisma: PrismaClient;
  ladder: Pick<LadderService, 'holdPointEvent' | 'releasePointEvent' | 'reversePointEvent'>;
  marketplace: {
    hasReciprocalRelationship(leaderUserId: string, companyId: string): Promise<boolean>;
  };
}

// Typy punktowe ścieżki community — do detektorów (globalne wartości enum
// Prisma, nie import międzymodułowy: antifraud nie sięga do logiki ladder).
const COMMUNITY_POINT_TYPES = ['ANSWER_ACCEPTED', 'ANSWER_UPVOTED_QUALIFIED'] as const;
// Dobowy limit punktowanych zdarzeń community (kamień decyzyjny właściciela,
// Sprint 5). Nadmiar ponad ten próg → HOLD do decyzji moderatora.
const COMMUNITY_DAILY_LIMIT = 5;
// Okno wykrywania wzajemnej adoracji A↔B w Q&A.
const RECIPROCITY_QA_WINDOW_DAYS = 7;

export function createAntifraudService({ prisma, ladder, marketplace }: AntifraudDeps) {
  // Wspólny zapis flagi: FraudSignal → HOLD punktu → sprawa moderacyjna.
  async function flagAndHold(
    payload: PointPendingPayload,
    type: string,
    detail: string,
    note: string,
  ) {
    const signal = await prisma.fraudSignal.create({
      data: {
        type,
        userId: payload.userId,
        counterpartyId: payload.counterpartyId,
        payload: { pointEventId: payload.pointEventId, orderId: payload.orderId ?? null, detail },
      },
    });
    await ladder.holdPointEvent(payload.pointEventId, type);
    return prisma.moderationCase.create({
      data: {
        source: 'FRAUD_SIGNAL',
        subjectUserId: payload.userId,
        fraudSignalId: signal.id,
        pointEventId: payload.pointEventId,
        note,
      },
    });
  }

  // Detektory ścieżki community (Sprint 5): limit dobowy + wzajemna adoracja.
  async function evaluateCommunityPoint(payload: PointPendingPayload, now: Date) {
    if (!payload.counterpartyId) return null;

    // Wzajemna adoracja: istnieje punktowane zdarzenie community z ODWRÓCONĄ
    // parą (uznający ↔ uznawany) w oknie — A akceptuje B, B akceptuje A.
    const reciprocityStart = new Date(now.getTime() - RECIPROCITY_QA_WINDOW_DAYS * 86_400_000);
    const mutual = await prisma.pointEvent.findFirst({
      where: {
        userId: payload.counterpartyId,
        counterpartyId: payload.userId,
        type: { in: [...COMMUNITY_POINT_TYPES] },
        status: { not: 'REVERSED' },
        createdAt: { gte: reciprocityStart },
      },
      select: { id: true },
    });
    if (mutual) {
      return flagAndHold(
        payload,
        'RECIPROCITY_QA',
        'Wykryto wzajemne uznawanie odpowiedzi w Q&A (A↔B) — możliwe zawyżanie punktów.',
        'Automatyczna flaga: wzajemna adoracja w Q&A. Punkty wstrzymane do decyzji.',
      );
    }

    // Limit dobowy: liczba punktowanych zdarzeń community usera w ostatnich 24h
    // (wliczając bieżące). Powyżej progu → HOLD nadmiarowego punktu.
    const dayStart = new Date(now.getTime() - 86_400_000);
    const dailyCount = await prisma.pointEvent.count({
      where: {
        userId: payload.userId,
        type: { in: [...COMMUNITY_POINT_TYPES] },
        status: { not: 'REVERSED' },
        createdAt: { gte: dayStart },
      },
    });
    if (dailyCount > COMMUNITY_DAILY_LIMIT) {
      return flagAndHold(
        payload,
        'RATE_LIMIT_QA',
        `Przekroczono dobowy limit ${COMMUNITY_DAILY_LIMIT} punktowanych zdarzeń Q&A (${dailyCount}).`,
        'Automatyczna flaga: dobowy limit punktów Q&A. Punkt wstrzymany do decyzji.',
      );
    }
    return null;
  }

  return {
    // Konsument ladder.point_pending_created: detektory biegną w oknie
    // karencji — flaga wstrzymuje punkt ZANIM policzy się do awansu.
    async evaluatePendingPoint(payload: PointPendingPayload, now = new Date()) {
      if (payload.kind === 'community') return evaluateCommunityPoint(payload, now);

      // Ścieżka marketplace (domyślna): wzajemność zleceń Firma↔Lider.
      if (!payload.counterpartyId) return null;

      const reciprocal = await marketplace.hasReciprocalRelationship(
        payload.userId,
        payload.counterpartyId,
      );
      if (!reciprocal) return null;

      return flagAndHold(
        payload,
        'RECIPROCITY',
        'Wykryto wzajemną relację zleceń: firma Lidera zleca pracę członkom firmy oceniającej',
        'Automatyczna flaga: wzajemność zleceń Firma↔Lider. Punkty wstrzymane do decyzji.',
      );
    },

    // Zgłoszenie treści przez użytkownika (D7) → ModerationCase źródło REPORT.
    // Soft-dedup: to samo zgłoszenie (ten sam zgłaszający + encja) nie mnoży spraw.
    async createReport(
      reporterUserId: string,
      input: { subjectType: 'POST' | 'THREAD' | 'ORDER'; subjectId: string; reason: string },
    ) {
      const existing = await prisma.moderationCase.findFirst({
        where: {
          status: 'OPEN',
          source: 'REPORT',
          reportedByUserId: reporterUserId,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
        },
        select: { id: true },
      });
      if (existing) return { id: existing.id, duplicate: true };
      const created = await prisma.moderationCase.create({
        data: {
          source: 'REPORT',
          reportedByUserId: reporterUserId,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          note: input.reason,
        },
      });
      return { id: created.id, duplicate: false };
    },

    async listCases(status: 'OPEN' | 'RESOLVED') {
      return prisma.moderationCase.findMany({
        where: { status },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
    },

    // Człowiek rozstrzyga (ADR-004): RELEASE przywraca punkt do karencji,
    // REJECT trwale go cofa (REVERSED / korekta ujemna).
    async resolveCase(moderatorId: string, caseId: string, input: ModerationResolveInput) {
      const moderationCase = await prisma.moderationCase.findUnique({ where: { id: caseId } });
      if (!moderationCase || moderationCase.status !== 'OPEN') {
        throw new NotFoundError('Sprawa nie istnieje lub jest już rozstrzygnięta');
      }
      if (moderationCase.pointEventId) {
        if (input.action === 'RELEASE') {
          await ladder.releasePointEvent(moderationCase.pointEventId);
        } else {
          await ladder.reversePointEvent(moderationCase.pointEventId, moderatorId, input.note);
        }
      }
      await prisma.moderationCase.update({
        where: { id: caseId },
        data: {
          status: 'RESOLVED',
          resolution: input.action,
          note: input.note,
          resolvedById: moderatorId,
          resolvedAt: new Date(),
        },
      });
      return { id: caseId, resolution: input.action };
    },
  };
}

export type AntifraudService = ReturnType<typeof createAntifraudService>;

import type { ModerationResolveInput } from '@lot/contracts';

import type { PrismaClient } from '../../shared/db';
import { NotFoundError } from '../../shared/errors';
import type { LadderService } from '../ladder/index';

export interface PointPendingPayload {
  pointEventId: string;
  userId: string;
  counterpartyId: string | null;
  orderId?: string;
}

export interface AntifraudDeps {
  prisma: PrismaClient;
  ladder: Pick<LadderService, 'holdPointEvent' | 'releasePointEvent' | 'reversePointEvent'>;
  marketplace: {
    hasReciprocalRelationship(leaderUserId: string, companyId: string): Promise<boolean>;
  };
}

export function createAntifraudService({ prisma, ladder, marketplace }: AntifraudDeps) {
  return {
    // Konsument ladder.point_pending_created: detektory biegną w oknie
    // karencji — flaga wstrzymuje punkt ZANIM policzy się do awansu.
    async evaluatePendingPoint(payload: PointPendingPayload) {
      if (!payload.counterpartyId) return null;

      const reciprocal = await marketplace.hasReciprocalRelationship(
        payload.userId,
        payload.counterpartyId,
      );
      if (!reciprocal) return null;

      const signal = await prisma.fraudSignal.create({
        data: {
          type: 'RECIPROCITY',
          userId: payload.userId,
          counterpartyId: payload.counterpartyId,
          payload: {
            pointEventId: payload.pointEventId,
            orderId: payload.orderId ?? null,
            detail:
              'Wykryto wzajemną relację zleceń: firma Lidera zleca pracę członkom firmy oceniającej',
          },
        },
      });
      await ladder.holdPointEvent(payload.pointEventId, 'RECIPROCITY');
      const moderationCase = await prisma.moderationCase.create({
        data: {
          source: 'FRAUD_SIGNAL',
          subjectUserId: payload.userId,
          fraudSignalId: signal.id,
          pointEventId: payload.pointEventId,
          note: 'Automatyczna flaga: wzajemność zleceń Firma↔Lider. Punkty wstrzymane do decyzji.',
        },
      });
      return moderationCase;
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

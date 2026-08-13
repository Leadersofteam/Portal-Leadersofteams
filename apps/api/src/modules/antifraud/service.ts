import type {
  ModerationResolveInput,
  ModerationSubjectView,
  ReportSubjectType,
} from '@lot/contracts';

import type { PrismaClient } from '../../shared/db';
import { DomainError, NotFoundError } from '../../shared/errors';
import type { LadderService } from '../ladder/index';
import type { ModerationSubjectModule } from './subjects';

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
  // Moduły wnoszące podgląd/ukrycie zgłoszonej treści (S12). Opcjonalne, bo
  // worker buduje ten sam serwis bez warstwy HTTP i moderacji nie obsługuje.
  subjects?: ModerationSubjectModule[];
}

// Typy punktowe ścieżki community — do detektorów (globalne wartości enum
// Prisma, nie import międzymodułowy: antifraud nie sięga do logiki ladder).
const COMMUNITY_POINT_TYPES = ['ANSWER_ACCEPTED', 'ANSWER_UPVOTED_QUALIFIED'] as const;
// Dobowy limit punktowanych zdarzeń community (kamień decyzyjny właściciela,
// Sprint 5). Nadmiar ponad ten próg → HOLD do decyzji moderatora.
const COMMUNITY_DAILY_LIMIT = 5;
// Okno wykrywania wzajemnej adoracji A↔B w Q&A.
const RECIPROCITY_QA_WINDOW_DAYS = 7;

export function createAntifraudService({
  prisma,
  ladder,
  marketplace,
  subjects = [],
}: AntifraudDeps) {
  const subjectsByType = new Map<ReportSubjectType, ModerationSubjectModule>(
    subjects.map((s) => [s.subjectType, s]),
  );

  // Treść, której moduł nie znalazł u siebie, została usunięta (przez autora
  // albo przez RODO). Panel MUSI to pokazać wprost — moderator, który widzi
  // pustą kartę, nie wie, czy treść zniknęła, czy panel jest zepsuty.
  const MISSING: ModerationSubjectView = {
    exists: false,
    hidden: true,
    title: null,
    excerpt: null,
    authorUserId: null,
    authorDisplayName: null,
    canHide: false,
  };
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
      input: {
        subjectType: 'POST' | 'THREAD' | 'ORDER' | 'SOCIAL_POST';
        subjectId: string;
        reason: string;
      },
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

    // Sprawy WRAZ ze zgłoszoną treścią (S12). Do S12 zwracaliśmy same wiersze,
    // przez co panel pokazywał notatkę bez żadnego sposobu dotarcia do treści.
    async listCases(status: 'OPEN' | 'RESOLVED') {
      const cases = await prisma.moderationCase.findMany({
        where: { status },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      // Grupujemy po typie i pytamy każdy moduł RAZ o wszystkie swoje id.
      // Pojedyncze zapytanie na sprawę byłoby N+1 na widoku, który przy
      // pierwszej fali zgłoszeń jest dokładnie tym, co ktoś odświeża co minutę.
      const idsByType = new Map<ReportSubjectType, string[]>();
      for (const c of cases) {
        if (!c.subjectType || !c.subjectId) continue;
        const type = c.subjectType as ReportSubjectType;
        if (!subjectsByType.has(type)) continue;
        idsByType.set(type, [...(idsByType.get(type) ?? []), c.subjectId]);
      }

      const loaded = new Map<string, ModerationSubjectView>();
      await Promise.all(
        [...idsByType.entries()].map(async ([type, ids]) => {
          const module = subjectsByType.get(type);
          if (!module) return;
          const canHide = typeof module.hide === 'function';
          const previews = await module.loadMany([...new Set(ids)]);
          for (const [id, preview] of previews) {
            // canHide łączy dwa warunki: czy typ w ogóle da się ukryć i czy
            // treść nie jest już ukryta. Panel nie pokaże wtedy martwego przycisku.
            loaded.set(`${type}:${id}`, { ...preview, canHide: canHide && !preview.hidden });
          }
        }),
      );

      return cases.map((c) => ({
        ...c,
        subject:
          c.subjectType && c.subjectId
            ? (loaded.get(`${c.subjectType}:${c.subjectId}`) ?? MISSING)
            : null,
      }));
    },

    // Człowiek rozstrzyga (ADR-004). Dwa światy, dwa zestawy akcji:
    //  - RELEASE/REJECT dotyczą PUNKTU (sprawy z sygnału antyfraudowego),
    //  - HIDE/DISMISS dotyczą TREŚCI (zgłoszenia użytkowników).
    // Do S12 istniały tylko dwie pierwsze i „rozstrzygały" także zgłoszenia,
    // nie robiąc z treścią absolutnie nic — sprawa znikała z listy, problem nie.
    async resolveCase(moderatorId: string, caseId: string, input: ModerationResolveInput) {
      const moderationCase = await prisma.moderationCase.findUnique({ where: { id: caseId } });
      if (!moderationCase || moderationCase.status !== 'OPEN') {
        throw new NotFoundError('Sprawa nie istnieje lub jest już rozstrzygnięta');
      }

      if (input.action === 'RELEASE' || input.action === 'REJECT') {
        // Twardo, zamiast po cichu zamknąć: kliknięcie „zwolnij punkty" na
        // sprawie bez punktu zawsze było nieporozumieniem, a interfejs to
        // nieporozumienie podpowiadał.
        if (!moderationCase.pointEventId) {
          throw new DomainError(
            'NO_POINT_EVENT',
            'Ta sprawa nie dotyczy punktów. Użyj „Ukryj treść" albo „Odrzuć zgłoszenie".',
            400,
          );
        }
        if (input.action === 'RELEASE') {
          await ladder.releasePointEvent(moderationCase.pointEventId);
        } else {
          await ladder.reversePointEvent(moderationCase.pointEventId, moderatorId, input.note);
        }
      }

      if (input.action === 'HIDE') {
        const type = moderationCase.subjectType as ReportSubjectType | null;
        const module = type ? subjectsByType.get(type) : undefined;
        if (!moderationCase.subjectId || !module?.hide) {
          throw new DomainError(
            'CANNOT_HIDE',
            'Tej treści nie da się ukryć z panelu. Zlecenie jest umową dwóch stron — zajmij się sprawą poza systemem.',
            400,
          );
        }
        await module.hide(moderationCase.subjectId, moderatorId);
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

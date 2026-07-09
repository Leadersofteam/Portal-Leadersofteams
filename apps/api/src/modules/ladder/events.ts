import type {
  AnswerAcceptedPayload,
  AnswerUpvotedPayload,
  LadderService,
  ReviewPublishedPayload,
} from './service';

export type EventHandler = (payload: unknown) => Promise<unknown>;

// GRANICA ANTY-MLM (ADR-002 §5, ADR-010 dec. 4): ladder subskrybuje WYŁĄCZNIE
// zdarzenia marketplace.* i community.*. Dodanie subskrypcji groups.*/teams.*
// łamie test w subscriptions.test.ts i wymaga rewizji ADR-004.
// Sprint 5: community.* zasila Drabinkę PO RAZ PIERWSZY (druga ścieżka awansu,
// brief 3.3) — to zaprojektowane (ADR-004), nie zmiana reguły anty-MLM.
export function ladderSubscriptions(ladder: LadderService): Record<string, EventHandler> {
  return {
    'marketplace.review_published': (payload) =>
      ladder.handleReviewPublished(payload as ReviewPublishedPayload),
    'community.answer_accepted': (payload) =>
      ladder.handleAnswerAccepted(payload as AnswerAcceptedPayload),
    'community.answer_upvoted': (payload) =>
      ladder.handleAnswerUpvoted(payload as AnswerUpvotedPayload),
  };
}

export const LADDER_ALLOWED_EVENT_PREFIXES = ['marketplace.', 'community.'] as const;

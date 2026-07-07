import type { LadderService, ReviewPublishedPayload } from './service';

export type EventHandler = (payload: unknown) => Promise<unknown>;

// GRANICA ANTY-MLM (ADR-002 §5, ADR-010 dec. 4): ladder subskrybuje WYŁĄCZNIE
// zdarzenia marketplace.* i community.*. Dodanie subskrypcji groups.*/teams.*
// łamie test w subscriptions.test.ts i wymaga rewizji ADR-004.
export function ladderSubscriptions(ladder: LadderService): Record<string, EventHandler> {
  return {
    'marketplace.review_published': (payload) =>
      ladder.handleReviewPublished(payload as ReviewPublishedPayload),
  };
}

export const LADDER_ALLOWED_EVENT_PREFIXES = ['marketplace.', 'community.'] as const;

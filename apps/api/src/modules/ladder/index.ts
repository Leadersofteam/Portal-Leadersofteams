// Publiczne API modułu ladder (granice modułów — ADR-002).
// Logika punktowa istnieje wyłącznie tutaj — jeden punkt audytu anty-MLM.
export { createLadderService } from './service';
export type { LadderService, ReviewPublishedPayload } from './service';
export { ladderSubscriptions, LADDER_ALLOWED_EVENT_PREFIXES } from './events';
export type { EventHandler } from './events';
export { ladderRoutes } from './routes';
export {
  LEVELS,
  RULESET_VERSION,
  MATURATION_DAYS,
  REVIEW_PUBLICATION_WINDOW_DAYS,
  basePointsForRating,
  computeLevel,
  diminishingWeight,
} from './rules';

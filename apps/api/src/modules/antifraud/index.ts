// Publiczne API modułu antifraud (granice modułów — ADR-002).
export { createAntifraudService } from './service';
export type { AntifraudService, AntifraudDeps, PointPendingPayload } from './service';
export { antifraudSubscriptions } from './events';
export { antifraudRoutes } from './routes';
export type { AntifraudRoutesDeps } from './routes';
// Kontrakt podglądu/ukrycia zgłoszonej treści (S12). Implementują go moduły
// będące właścicielami treści (social/groups/community/marketplace) — antifraud
// tylko komponuje, bo nie wolno mu czytać cudzych tabel (ADR-002).
export { excerpt, MODERATION_EXCERPT_LENGTH } from './subjects';
export type { ModerationSubjectModule, ModerationSubjectPreview } from './subjects';

// Publiczne API modułu community (granice modułów — ADR-002).
//
// GRANICA ANTY-MLM (ADR-004 / brief 3.3): community JAKO JEDYNY moduł poza
// marketplace emituje zdarzenia (community.answer_accepted / answer_upvoted)
// konsumowane przez ladder — to DRUGA, PUNKTOWANA ścieżka awansu i jest to
// ZAPROJEKTOWANE (ADR-004), nie zmiana reguły. Sam moduł NIE zawiera logiki
// punktowej: naliczanie żyje wyłącznie w ladder (jeden punkt audytu anty-MLM).
// Zdarzenie community.thread_created / answer_created zasila tylko notifications.
export { createCommunityService } from './service';
export type { CommunityService, CommunityServiceDeps } from './service';
export { communityRoutes } from './routes';
export type { CommunityRoutesDeps } from './routes';

// Publiczne API modułu antifraud (granice modułów — ADR-002).
export { createAntifraudService } from './service';
export type { AntifraudService, AntifraudDeps, PointPendingPayload } from './service';
export { antifraudSubscriptions } from './events';
export { antifraudRoutes } from './routes';
export type { AntifraudRoutesDeps } from './routes';

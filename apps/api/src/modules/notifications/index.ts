// Publiczne API modułu notifications (granice modułów — ADR-002).
// Konsument zdarzeń domenowych (D1): zamienia zdarzenia w powiadomienia in-app
// i budzi socket użytkownika. Zero logiki punktowej.
export { createNotificationsService } from './service';
export type { NotificationsService, NotificationsServiceDeps, NotificationSignal } from './service';
export { notificationsSubscriptions } from './events';
export { notificationsRoutes } from './routes';
export type { NotificationsRoutesDeps } from './routes';

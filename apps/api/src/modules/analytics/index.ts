// Publiczne API modułu analytics (granice modułów — ADR-002).
//
// GRANICA ANTY-MLM (ADR-004): ten moduł tylko CZYTA. Nie emituje zdarzeń,
// nie jest subskrybowany przez ladder i nie zna pojęcia punktu. Statystyka
// nigdy nie może stać się źródłem awansu — status przyznaje wyłącznie człowiek
// za realną pracę.
//
// GRANICA ANTY-ENGAGEMENT (ADR-010): dane trafiają WYŁĄCZNIE do panelu
// moderatora. Żadnych liczników wyświetleń przy treści, żadnych rankingów
// popularności dla użytkowników, żadnych streaków.
export { createAnalyticsService } from './service';
export type {
  AnalyticsService,
  AnalyticsDeps,
  AnalyticsCountSource,
  AnalyticsSummary,
  AnalyticsDay,
} from './service';
export { analyticsRoutes } from './routes';
export type { AnalyticsRoutesDeps } from './routes';

// Publiczne API modułu search (granice modułów — ADR-002).
//
// ANTY-MLM: wyszukiwarka jest wyłącznie odczytem. Nie emituje zdarzeń, nie
// zapisuje historii zapytań i nie zna pojęcia punktu.
export { createSearchService, SEARCH_NS } from './service';
export type { SearchService, SearchDeps, SearchScope } from './service';
export { searchRoutes } from './routes';
export type { SearchRoutesDeps } from './routes';

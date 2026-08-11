// Publiczne API modułu listings (granice modułów — ADR-002).
export { createListingsService } from './service';
export type { ListingsService, ListingsDeps } from './service';
export { listingsRoutes } from './routes';
export type { ListingsRoutesDeps } from './routes';
export { createListingsAccountData } from './account';

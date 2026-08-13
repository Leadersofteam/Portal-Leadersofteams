// Publiczne API modułu marketplace (granice modułów — ADR-002).
export { createProfilesService } from './profiles.service';
export type { ProfilesService } from './profiles.service';
export { createOrdersService } from './orders.service';
export type { OrdersService, OrdersServiceDeps } from './orders.service';
export { createReviewsService } from './reviews.service';
export type { ReviewsService, ReviewsServiceDeps } from './reviews.service';
export { marketplaceRoutes } from './routes';
export type { MarketplaceRoutesDeps } from './routes';
export { createMarketplaceAccountData } from './account';
export { createMarketplaceModerationSubject } from './moderation';

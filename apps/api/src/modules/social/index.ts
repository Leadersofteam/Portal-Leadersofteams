// Publiczne API modułu social (granice modułów — ADR-002).
export { createSocialService } from './service';
export type { SocialService, SocialDeps } from './service';
export { socialSubscriptions } from './events';
export { socialRoutes } from './routes';
export type { SocialRoutesDeps } from './routes';
export { createSocialAccountData } from './account';

// Publiczne API modułu identity (granice modułów — ADR-002).
export { createIdentityService } from './service';
export type {
  IdentityService,
  IdentityDeps,
  AccountDataModule,
  PublicUser,
  CompanySummary,
} from './service';
export { identityRoutes } from './routes';
export type { IdentityRoutesDeps } from './routes';

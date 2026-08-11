// Publiczne API modułu files (granice modułów — ADR-002).
export { createFilesService, FILE_VARIANTS } from './service';
export type { FilesService, FilesDeps, FileVariant, StoredFileDto } from './service';
export { filesRoutes } from './routes';
export type { FilesRoutesDeps } from './routes';
export { createFilesAccountData } from './account';

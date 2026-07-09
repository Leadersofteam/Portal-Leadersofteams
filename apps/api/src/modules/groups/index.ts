// Publiczne API modułu groups (granice modułów — ADR-002).
//
// GRANICA ANTY-MLM (ADR-010 dec. 4): groups emituje zdarzenia groups.* wyłącznie
// do notifications/moderacji — NIGDY do ladder. Aktywność w grupach (posty,
// komentarze, reakcje, członkostwo) = 0 punktów Drabinki. Ten moduł nie eksportuje
// żadnej logiki punktowej i nie jest subskrybowany przez ladder.
export { createGroupsService, GROUP_CREATION_MIN_LEVEL } from './service';
export type { GroupsService, GroupsServiceDeps } from './service';
export { groupsRoutes } from './routes';
export type { GroupsRoutesDeps } from './routes';
export { createGroupsAccountData } from './account';

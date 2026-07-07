import type { FastifyInstance } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import type { LadderService } from './service';

export interface LadderRoutesDeps {
  ladder: LadderService;
  auth: AuthHelpers;
}

export function ladderRoutes({ ladder, auth }: LadderRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    // Publiczne zasady punktacji — transparentność mechaniki (ADR-004).
    app.get('/ladder/levels', async (_request, reply) => {
      return reply.send({ levels: await ladder.listLevels() });
    });

    // Ekran "Moje punkty": pełny ledger, zawsze świeży (bez cache).
    app.get('/me/ladder', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await ladder.getMyLadder(user.id));
    });
  };
}

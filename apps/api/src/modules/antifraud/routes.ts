import { moderationResolveInputSchema } from '@lot/contracts';
import type { FastifyInstance } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import { parseBody } from '../../shared/validation';
import type { AntifraudService } from './service';

export interface AntifraudRoutesDeps {
  antifraud: AntifraudService;
  auth: AuthHelpers;
}

export function antifraudRoutes({ antifraud, auth }: AntifraudRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    app.get('/moderation/cases', async (request, reply) => {
      await auth.requireRole(request, ['MODERATOR', 'ADMIN']);
      const { status } = request.query as { status?: string };
      const cases = await antifraud.listCases(status === 'RESOLVED' ? 'RESOLVED' : 'OPEN');
      return reply.send({ cases });
    });

    app.post('/moderation/cases/:id/resolve', async (request, reply) => {
      const moderator = await auth.requireRole(request, ['MODERATOR', 'ADMIN']);
      const { id } = request.params as { id: string };
      const input = parseBody(moderationResolveInputSchema, request.body);
      return reply.send(await antifraud.resolveCase(moderator.id, id, input));
    });
  };
}

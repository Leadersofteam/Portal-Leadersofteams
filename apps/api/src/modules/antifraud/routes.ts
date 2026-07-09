import { moderationResolveInputSchema, reportInputSchema } from '@lot/contracts';
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
    // Zgłoszenie treści (D7) — każdy zalogowany może zgłosić Post/Wątek/Zlecenie.
    app.post('/reports', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(reportInputSchema, request.body);
      return reply.code(201).send(await antifraud.createReport(user.id, input));
    });

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

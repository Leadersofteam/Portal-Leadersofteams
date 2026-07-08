import { notificationsFiltersSchema, notificationsReadInputSchema } from '@lot/contracts';
import type { FastifyInstance } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import { parseBody } from '../../shared/validation';
import type { NotificationsService } from './service';

export interface NotificationsRoutesDeps {
  notifications: NotificationsService;
  auth: AuthHelpers;
}

export function notificationsRoutes({ notifications, auth }: NotificationsRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    app.get('/me/notifications', async (request, reply) => {
      const user = await auth.requireUser(request);
      const filters = parseBody(notificationsFiltersSchema, request.query ?? {});
      return reply.send(await notifications.list(user.id, filters));
    });

    app.get('/me/notifications/unread-count', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await notifications.unreadCount(user.id));
    });

    app.post('/me/notifications/read', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(notificationsReadInputSchema, request.body);
      return reply.send(await notifications.markRead(user.id, input));
    });
  };
}

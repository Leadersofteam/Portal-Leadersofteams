import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { AuthHelpers } from '../../shared/auth';
import { parseBody } from '../../shared/validation';
import type { SocialService } from './service';

export interface SocialRoutesDeps {
  social: SocialService;
  auth: AuthHelpers;
}

const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function socialRoutes({ social, auth }: SocialRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    app.put<{ Params: { id: string } }>('/users/:id/follow', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await social.follow(user.id, request.params.id));
    });

    app.delete<{ Params: { id: string } }>('/users/:id/follow', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await social.unfollow(user.id, request.params.id));
    });

    app.get<{ Params: { id: string } }>('/users/:id/follow', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send({ following: await social.isFollowing(user.id, request.params.id) });
    });

    app.get('/feed', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { cursor, limit } = parseBody(feedQuerySchema, request.query);
      return reply.send(await social.getFeed(user.id, cursor, limit));
    });

    app.get<{ Params: { handle: string } }>('/profiles/:handle', async (request, reply) => {
      return reply.send(await social.getPublicProfile(request.params.handle));
    });

    app.get('/me/social', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await social.getMySocial(user.id));
    });
  };
}

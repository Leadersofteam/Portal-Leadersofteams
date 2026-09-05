import {
  createAnswerInputSchema,
  createThreadInputSchema,
  threadFiltersSchema,
} from '@lot/contracts';
import type { FastifyInstance } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import { parseBody } from '../../shared/validation';
import type { CommunityService } from './service';

export interface CommunityRoutesDeps {
  community: CommunityService;
  auth: AuthHelpers;
}

export function communityRoutes({ community, auth }: CommunityRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    // --- odczyty (publiczne — jak feed grupy) --------------------------------
    app.get('/groups/:id/threads', async (request, reply) => {
      const { id } = request.params as { id: string };
      const filters = parseBody(threadFiltersSchema, request.query ?? {});
      return reply.send(await community.listThreads(id, filters));
    });

    // PL4: publiczna lista wątków ze WSZYSTKICH grup — hub /pytania (baza
    // wiedzy z rozwiązanych pytań pod long-tail). Chronologicznie (ADR-010),
    // ten sam filtr statusu co lista grupy. Ukryte przez moderatora nie wracają.
    app.get('/threads', async (request, reply) => {
      const filters = parseBody(threadFiltersSchema, request.query ?? {});
      return reply.send(await community.listThreadsPublic(filters));
    });

    app.get('/threads/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const viewer = await auth.currentUser(request);
      return reply.send(await community.getThread(id, viewer?.id ?? null));
    });

    // --- mutacje (wymagają zalogowania / członkostwa) ------------------------
    app.post('/groups/:id/threads', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      const input = parseBody(createThreadInputSchema, request.body);
      return reply.code(201).send(await community.askQuestion(user.id, id, input));
    });

    app.post('/threads/:id/answers', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      const input = parseBody(createAnswerInputSchema, request.body);
      return reply.code(201).send(await community.answer(user.id, id, input));
    });

    app.post('/answers/:id/accept', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await community.acceptAnswer(user.id, id));
    });

    app.post('/answers/:id/vote', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await community.voteAnswer(user.id, id));
    });
  };
}

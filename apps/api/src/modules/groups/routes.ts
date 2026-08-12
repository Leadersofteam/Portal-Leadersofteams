import {
  createCommentInputSchema,
  createGroupInputSchema,
  createPostInputSchema,
  feedFiltersSchema,
  groupFiltersSchema,
  updatePostInputSchema,
} from '@lot/contracts';
import type { FastifyInstance } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import { parseBody } from '../../shared/validation';
import type { GroupsService } from './service';

export interface GroupsRoutesDeps {
  groups: GroupsService;
  auth: AuthHelpers;
}

export function groupsRoutes({ groups, auth }: GroupsRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    // --- listing i szczegóły (publiczne — jak listing zleceń) ----------------
    app.get('/groups', async (request, reply) => {
      const filters = parseBody(groupFiltersSchema, request.query ?? {});
      return reply.send(await groups.listGroups(filters));
    });

    app.get('/groups/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const viewer = await auth.currentUser(request);
      return reply.send(await groups.getGroup(id, viewer?.id ?? null));
    });

    app.get('/groups/:id/feed', async (request, reply) => {
      const { id } = request.params as { id: string };
      const filters = parseBody(feedFiltersSchema, request.query ?? {});
      const viewer = await auth.currentUser(request);
      return reply.send(await groups.getGroupFeed(id, viewer?.id ?? null, filters));
    });

    app.get('/posts/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const viewer = await auth.currentUser(request);
      return reply.send(await groups.getPost(id, viewer?.id ?? null));
    });

    // --- mutacje (wymagają zalogowania / członkostwa) ------------------------
    app.post('/groups', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(createGroupInputSchema, request.body);
      return reply.code(201).send(await groups.createGroup(user.id, input));
    });

    app.post('/groups/:id/join', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await groups.join(user.id, id));
    });

    app.post('/groups/:id/leave', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      await groups.leave(user.id, id);
      return reply.send({ ok: true });
    });

    app.get('/groups/:id/members/pending', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send({ pending: await groups.listPendingMemberships(user.id, id) });
    });

    app.post('/memberships/:id/approve', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await groups.approveMembership(user.id, id));
    });

    app.post('/groups/:id/posts', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      const input = parseBody(createPostInputSchema, request.body);
      return reply.code(201).send(await groups.createPost(user.id, id, input));
    });

    // Edycja/usuwanie WŁASNYCH treści (S4) — soft delete, bez punktów.
    app.patch('/posts/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      const input = parseBody(updatePostInputSchema, request.body);
      return reply.send(await groups.updatePost(user.id, id, input));
    });

    app.delete('/posts/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await groups.deletePost(user.id, id));
    });

    app.delete('/comments/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await groups.deleteComment(user.id, id));
    });

    app.post('/posts/:id/comments', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      const input = parseBody(createCommentInputSchema, request.body);
      return reply.code(201).send(await groups.addComment(user.id, id, input));
    });

    app.post('/posts/:id/react', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await groups.react(user.id, id));
    });

    app.delete('/posts/:id/react', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await groups.unreact(user.id, id));
    });
  };
}

import {
  bookmarkSubjectTypeSchema,
  bookmarksQuerySchema,
  createSocialCommentInputSchema,
  createSocialPostInputSchema,
  feedQuerySchema,
  updateSocialPostInputSchema,
} from '@lot/contracts';
import type { FastifyInstance } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import { NotFoundError, UnauthorizedError } from '../../shared/errors';
import { parseBody } from '../../shared/validation';
import type { SocialService } from './service';

export interface SocialRoutesDeps {
  social: SocialService;
  auth: AuthHelpers;
}

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

    // --- wpisy portalowe ------------------------------------------------------
    // Prefiks /social/posts jest OBOWIĄZKOWY: /posts/:id należy do modułu groups
    // (Fastify odmówiłby startu przy zduplikowanej trasie).

    app.post('/social/posts', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(createSocialPostInputSchema, request.body);
      return reply.code(201).send(await social.createPost(user.id, input));
    });

    app.get<{ Params: { id: string } }>('/social/posts/:id', async (request, reply) => {
      const viewer = await auth.currentUser(request);
      return reply.send(await social.getPost(request.params.id, viewer?.id));
    });

    app.patch<{ Params: { id: string } }>('/social/posts/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(updateSocialPostInputSchema, request.body);
      return reply.send(await social.updatePost(user.id, request.params.id, input));
    });

    app.delete<{ Params: { id: string } }>('/social/posts/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await social.deletePost(user.id, request.params.id));
    });

    app.post<{ Params: { id: string } }>('/social/posts/:id/comments', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(createSocialCommentInputSchema, request.body);
      return reply.code(201).send(await social.addComment(user.id, request.params.id, input));
    });

    app.delete<{ Params: { id: string } }>('/social/comments/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await social.deleteComment(user.id, request.params.id));
    });

    app.put<{ Params: { id: string } }>('/social/posts/:id/appreciate', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await social.appreciate(user.id, request.params.id));
    });

    app.delete<{ Params: { id: string } }>(
      '/social/posts/:id/appreciate',
      async (request, reply) => {
        const user = await auth.requireUser(request);
        return reply.send(await social.unappreciate(user.id, request.params.id));
      },
    );

    // Feed: scope=all działa także dla gościa (treść i tak publiczna),
    // scope=following wymaga sesji — bez niej nie ma czyjej osi pokazać.
    // Tematy (#hashtagi) — publiczne, bo treść i tak jest publiczna.
    app.get('/topics/popular', async (_request, reply) => {
      return reply.send({ topics: await social.getPopularTopics() });
    });

    // UWAGA na kolejność: `/topics/popular` MUSI stać przed `/topics/:slug`,
    // inaczej „popular" zostałoby potraktowane jako slug tematu.
    app.get<{ Params: { slug: string } }>('/topics/:slug', async (request, reply) => {
      const result = await social.getTopic(request.params.slug);
      if (!result) throw new NotFoundError('Temat nie istnieje');
      return reply.send(result);
    });

    app.get('/feed', async (request, reply) => {
      const viewer = await auth.currentUser(request);
      const { scope, cursor, limit } = parseBody(feedQuerySchema, request.query);
      if (scope === 'following' && !viewer) throw new UnauthorizedError();
      return reply.send(await social.getFeed(viewer?.id ?? null, { scope, cursor, limit }));
    });

    app.get<{ Params: { handle: string } }>('/profiles/:handle', async (request, reply) => {
      return reply.send(await social.getPublicProfile(request.params.handle));
    });

    app.get('/me/social', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await social.getMySocial(user.id));
    });

    // --- Zakładki (S17) -------------------------------------------------------
    // Wszystko pod `/me/`: zakładka jest PRYWATNA i nie ma publicznego widoku
    // ani licznika (ADR-010). Rodzaj treści jest w ścieżce, bo ten sam
    // identyfikator może być wpisem portalowym albo postem w grupie.

    app.get('/me/bookmarks', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { cursor, limit } = parseBody(bookmarksQuerySchema, request.query ?? {});
      return reply.send(await social.listBookmarks(user.id, { cursor, limit }));
    });

    app.put<{ Params: { type: string; id: string } }>(
      '/me/bookmarks/:type/:id',
      async (request, reply) => {
        const user = await auth.requireUser(request);
        const type = parseBody(bookmarkSubjectTypeSchema, request.params.type);
        return reply.send(await social.bookmark(user.id, type, request.params.id));
      },
    );

    app.delete<{ Params: { type: string; id: string } }>(
      '/me/bookmarks/:type/:id',
      async (request, reply) => {
        const user = await auth.requireUser(request);
        const type = parseBody(bookmarkSubjectTypeSchema, request.params.type);
        return reply.send(await social.unbookmark(user.id, type, request.params.id));
      },
    );
  };
}

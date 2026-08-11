import {
  createInquiryInputSchema,
  createListingInputSchema,
  inquiryMessageInputSchema,
  listingFiltersSchema,
  updateListingInputSchema,
} from '@lot/contracts';
import type { FastifyInstance } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import { parseBody } from '../../shared/validation';
import type { IdentityService } from '../identity/index';
import type { LadderService } from '../ladder/index';
import type { ReviewsService } from '../marketplace/index';
import type { ListingsService } from './service';

export interface ListingsRoutesDeps {
  listings: ListingsService;
  ladder: Pick<LadderService, 'getLevels'>;
  reviews: Pick<ReviewsService, 'getLeaderReviewStatsMany'>;
  identity: Pick<IdentityService, 'getPublicUsers'>;
  auth: AuthHelpers;
}

export function listingsRoutes({ listings, ladder, reviews, identity, auth }: ListingsRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    // Karta katalogowa: usługa + DOŁĄCZONE dane Lidera (poziom/oceny/awatar) —
    // batch, ten sam wzorzec co /leaders.
    async function withLeaderMeta<
      T extends { leaderProfile: { userId: string; headline: string; isVisible: boolean } },
    >(rows: T[]) {
      const userIds = [...new Set(rows.map((l) => l.leaderProfile.userId))];
      const [levels, stats, users] = await Promise.all([
        ladder.getLevels(userIds),
        reviews.getLeaderReviewStatsMany(userIds),
        identity.getPublicUsers(userIds),
      ]);
      return rows.map(({ leaderProfile, ...l }) => ({
        ...l,
        leader: {
          userId: leaderProfile.userId,
          headline: leaderProfile.headline,
          displayName: users.get(leaderProfile.userId)?.displayName ?? 'Lider',
          avatarFileId: users.get(leaderProfile.userId)?.avatarFileId ?? null,
          level: levels.get(leaderProfile.userId) ?? 0,
          averageRating: stats.get(leaderProfile.userId)?.averageRating ?? null,
          reviewCount: stats.get(leaderProfile.userId)?.reviewCount ?? 0,
        },
      }));
    }

    app.get('/listings', async (request, reply) => {
      const filters = parseBody(listingFiltersSchema, request.query);
      const { listings: rows, nextCursor } = await listings.list(filters);
      const sessionUser = await auth.currentUser(request);
      const enriched = await withLeaderMeta(rows);
      const favorites = sessionUser
        ? await listings.favoriteIds(
            sessionUser.id,
            rows.map((r) => r.id),
          )
        : new Set<string>();
      return reply.send({
        listings: enriched.map((l) => ({ ...l, isFavorite: favorites.has(l.id) })),
        nextCursor,
      });
    });

    app.get<{ Params: { slug: string } }>('/listings/slug/:slug', async (request, reply) => {
      const listing = await listings.getBySlug(request.params.slug);
      const [enriched] = await withLeaderMeta([listing]);
      return reply.send({ listing: enriched });
    });

    app.post('/listings', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(createListingInputSchema, request.body);
      return reply.code(201).send(await listings.createDraft(user.id, input));
    });

    app.patch<{ Params: { id: string } }>('/listings/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(updateListingInputSchema, request.body);
      return reply.send(await listings.update(user.id, request.params.id, input));
    });

    for (const action of ['publish', 'pause', 'archive'] as const) {
      app.post<{ Params: { id: string } }>(`/listings/:id/${action}`, async (request, reply) => {
        const user = await auth.requireUser(request);
        return reply.send(await listings[action](user.id, request.params.id));
      });
    }

    app.get('/me/listings', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send({ listings: await listings.myListings(user.id) });
    });

    app.put<{ Params: { id: string } }>('/listings/:id/favorite', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await listings.setFavorite(user.id, request.params.id, true));
    });

    app.delete<{ Params: { id: string } }>('/listings/:id/favorite', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await listings.setFavorite(user.id, request.params.id, false));
    });

    app.get('/me/favorites', async (request, reply) => {
      const user = await auth.requireUser(request);
      const rows = await listings.myFavorites(user.id);
      return reply.send({ listings: await withLeaderMeta(rows) });
    });

    // --- Zapytania -----------------------------------------------------------

    app.post<{ Params: { id: string } }>('/listings/:id/inquiries', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(createInquiryInputSchema, request.body);
      return reply.code(201).send(await listings.createInquiry(user.id, request.params.id, input));
    });

    app.get('/me/inquiries', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await listings.listMyInquiries(user.id));
    });

    app.get<{ Params: { id: string } }>('/inquiries/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send({ inquiry: await listings.getInquiry(user.id, request.params.id) });
    });

    app.post<{ Params: { id: string } }>('/inquiries/:id/messages', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(inquiryMessageInputSchema, request.body);
      return reply.code(201).send(await listings.addMessage(user.id, request.params.id, input));
    });

    app.post<{ Params: { id: string } }>('/inquiries/:id/close', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await listings.closeInquiry(user.id, request.params.id));
    });

    app.post<{ Params: { id: string } }>('/inquiries/:id/convert', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.code(201).send(await listings.convertToOrder(user.id, request.params.id));
    });
  };
}

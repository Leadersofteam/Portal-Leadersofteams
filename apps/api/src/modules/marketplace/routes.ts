import {
  createLeaderProfileInputSchema,
  createOfferInputSchema,
  createOrderInputSchema,
  leaderFiltersSchema,
  orderFiltersSchema,
  portfolioItemInputSchema,
  reviewInputSchema,
  updateLeaderProfileInputSchema,
  updateOrderInputSchema,
} from '@lot/contracts';
import type { FastifyInstance } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import { parseBody } from '../../shared/validation';
import type { LadderService } from '../ladder/index';
import type { OrdersService } from './orders.service';
import type { ProfilesService } from './profiles.service';
import type { ReviewsService } from './reviews.service';

export interface MarketplaceRoutesDeps {
  profiles: ProfilesService;
  orders: OrdersService;
  reviews: ReviewsService;
  ladder: Pick<LadderService, 'getLevel' | 'getLevels'>;
  auth: AuthHelpers;
}

export function marketplaceRoutes({
  profiles,
  orders,
  reviews,
  ladder,
  auth,
}: MarketplaceRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    // --- słownik branż -----------------------------------------------------
    app.get('/industries', async (_request, reply) => {
      return reply.send({ industries: await profiles.listIndustries() });
    });

    // --- profile Liderów ---------------------------------------------------
    // Publiczny katalog Liderów (/liderzy): profile + DOŁĄCZONY poziom Drabinki
    // i oceny (batch, bez logiki punktowej w marketplace).
    app.get('/leaders', async (request, reply) => {
      const filters = parseBody(leaderFiltersSchema, request.query);
      const { leaders, nextCursor } = await profiles.listPublicLeaders(filters);
      const userIds = leaders.map((l) => l.userId);
      const [levels, stats] = await Promise.all([
        ladder.getLevels(userIds),
        reviews.getLeaderReviewStatsMany(userIds),
      ]);
      return reply.send({
        leaders: leaders.map((l) => ({
          id: l.id,
          displayName: l.displayName,
          headline: l.headline,
          industry: l.industry,
          level: levels.get(l.userId) ?? 0,
          averageRating: stats.get(l.userId)?.averageRating ?? null,
          reviewCount: stats.get(l.userId)?.reviewCount ?? 0,
        })),
        nextCursor,
      });
    });

    app.get('/leaders/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const profile = (await profiles.getPublicProfile(id)) as { userId: string };
      const [level, stats] = await Promise.all([
        ladder.getLevel(profile.userId),
        reviews.getLeaderReviewStats(profile.userId),
      ]);
      return reply.send({ profile: { ...profile, level, ...stats } });
    });

    app.get('/me/leader-profile', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send({ profile: await profiles.getMyProfile(user.id) });
    });

    app.post('/me/leader-profile', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(createLeaderProfileInputSchema, request.body);
      return reply.code(201).send(await profiles.createProfile(user.id, input));
    });

    app.patch('/me/leader-profile', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(updateLeaderProfileInputSchema, request.body);
      return reply.send(await profiles.updateProfile(user.id, input));
    });

    app.post('/me/leader-profile/portfolio', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(portfolioItemInputSchema, request.body);
      return reply.code(201).send(await profiles.addPortfolioItem(user.id, input));
    });

    app.delete('/me/leader-profile/portfolio/:itemId', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { itemId } = request.params as { itemId: string };
      await profiles.removePortfolioItem(user.id, itemId);
      return reply.send({ ok: true });
    });

    // --- zlecenia: listing i szczegóły (publiczne) --------------------------
    app.get('/orders', async (request, reply) => {
      const filters = parseBody(orderFiltersSchema, request.query ?? {});
      return reply.send(await orders.listPublished(filters));
    });

    app.get('/orders/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const viewer = await auth.currentUser(request);
      return reply.send(await orders.getOrder(id, viewer?.id ?? null));
    });

    // --- zlecenia: strona Firmy ---------------------------------------------
    app.post('/orders', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(createOrderInputSchema, request.body);
      return reply.code(201).send(await orders.createDraft(user.id, input));
    });

    app.patch('/orders/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      const input = parseBody(updateOrderInputSchema, request.body);
      return reply.send(await orders.updateDraft(user.id, id, input));
    });

    app.post('/orders/:id/publish', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await orders.publish(user.id, id));
    });

    app.post('/orders/:id/cancel', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await orders.cancel(user.id, id));
    });

    app.get('/orders/:id/offers', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send({ offers: await orders.listOffersForOrder(user.id, id) });
    });

    app.post('/offers/:id/accept', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      return reply.send(await orders.acceptOffer(user.id, id));
    });

    app.post('/orders/:id/confirm', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      await orders.confirm(user.id, id);
      return reply.send({ ok: true });
    });

    // --- zlecenia: strona Lidera ---------------------------------------------
    app.post('/orders/:id/offers', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      const input = parseBody(createOfferInputSchema, request.body);
      return reply.code(201).send(await orders.submitOffer(user.id, id, input));
    });

    app.post('/offers/:id/withdraw', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      await orders.withdrawOffer(user.id, id);
      return reply.send({ ok: true });
    });

    app.post('/orders/:id/start', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      await orders.start(user.id, id);
      return reply.send({ ok: true });
    });

    app.post('/orders/:id/deliver', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      await orders.deliver(user.id, id);
      return reply.send({ ok: true });
    });

    // --- oceny (po CONFIRMED, publikacja symultaniczna) ------------------------
    app.post('/orders/:id/reviews', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      const input = parseBody(reviewInputSchema, request.body);
      return reply.code(201).send(await reviews.submitReview(user.id, id, input));
    });

    app.get('/orders/:id/reviews', async (request, reply) => {
      const { id } = request.params as { id: string };
      const viewer = await auth.currentUser(request);
      return reply.send(await reviews.listReviews(id, viewer?.id ?? null));
    });

    // --- obie strony -----------------------------------------------------------
    app.post('/orders/:id/dispute', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { id } = request.params as { id: string };
      await orders.dispute(user.id, id);
      return reply.send({ ok: true });
    });

    app.get('/me/offers', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send({ offers: await orders.myOffers(user.id) });
    });

    app.get('/me/orders', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send({ orders: await orders.myCompanyOrders(user.id) });
    });
  };
}

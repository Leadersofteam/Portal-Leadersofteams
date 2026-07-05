import {
  createLeaderProfileInputSchema,
  createOfferInputSchema,
  createOrderInputSchema,
  orderFiltersSchema,
  portfolioItemInputSchema,
  updateLeaderProfileInputSchema,
  updateOrderInputSchema,
} from '@lot/contracts';
import type { FastifyInstance } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import { parseBody } from '../../shared/validation';
import type { OrdersService } from './orders.service';
import type { ProfilesService } from './profiles.service';

export interface MarketplaceRoutesDeps {
  profiles: ProfilesService;
  orders: OrdersService;
  auth: AuthHelpers;
}

export function marketplaceRoutes({ profiles, orders, auth }: MarketplaceRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    // --- słownik branż -----------------------------------------------------
    app.get('/industries', async (_request, reply) => {
      return reply.send({ industries: await profiles.listIndustries() });
    });

    // --- profile Liderów ---------------------------------------------------
    app.get('/leaders/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      return reply.send({ profile: await profiles.getPublicProfile(id) });
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

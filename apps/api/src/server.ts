import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { FastifyBaseLogger, FastifyError, FastifyInstance } from 'fastify';

import { antifraudRoutes, createAntifraudService } from './modules/antifraud/index';
import { communityRoutes, createCommunityService } from './modules/community/index';
import { createGroupsService, groupsRoutes } from './modules/groups/index';
import { createIdentityService, identityRoutes } from './modules/identity/index';
import { createLadderService, ladderRoutes } from './modules/ladder/index';
import {
  createOrdersService,
  createProfilesService,
  createReviewsService,
  marketplaceRoutes,
} from './modules/marketplace/index';
import { createNotificationsService, notificationsRoutes } from './modules/notifications/index';
import { createAuthHelpers } from './shared/auth';
import type { AppConfig } from './shared/config';
import { createPrisma } from './shared/db';
import type { PrismaClient } from './shared/db';
import { DomainError } from './shared/errors';
import { createLogger } from './shared/logger';
import { createRealtime } from './shared/realtime';
import type { Realtime } from './shared/realtime';
import { createRedis } from './shared/redis';
import type { Redis } from './shared/redis';
import { createSessionStore } from './shared/session';

export interface AppContext {
  app: FastifyInstance;
  prisma: PrismaClient;
  redis: Redis;
  realtime: Realtime;
  close(): Promise<void>;
}

export async function buildServer(config: AppConfig): Promise<AppContext> {
  const logger = createLogger(config);
  const prisma = createPrisma(config.DATABASE_URL);
  const redis = createRedis(config.REDIS_URL);
  const sessions = createSessionStore(redis, config.SESSION_TTL_SECONDS);

  const app = Fastify({
    loggerInstance: logger as unknown as FastifyBaseLogger,
    trustProxy: true,
  });

  await app.register(helmet);
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: config.NODE_ENV === 'test' ? 10_000 : 300,
    timeWindow: '1 minute',
    redis,
    nameSpace: 'rl:',
  });

  // Jednolite mapowanie błędów domenowych i walidacyjnych na HTTP.
  app.setErrorHandler((error: FastifyError & { details?: unknown }, request, reply) => {
    if (error instanceof DomainError) {
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    }
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Nieobsłużony błąd');
      return reply
        .code(500)
        .send({ error: { code: 'INTERNAL', message: 'Wewnętrzny błąd serwera' } });
    }
    const code = typeof error.code === 'string' ? error.code : 'BAD_REQUEST';
    return reply
      .code(statusCode)
      .send({ error: { code, message: error.message, details: error.details } });
  });

  app.get('/healthz', async (_request, reply) => {
    const checks: Record<string, 'ok' | 'fail'> = { mysql: 'fail', redis: 'fail' };
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.mysql = 'ok';
    } catch {
      /* raportowane statusem */
    }
    try {
      if ((await redis.ping()) === 'PONG') checks.redis = 'ok';
    } catch {
      /* raportowane statusem */
    }
    const healthy = Object.values(checks).every((c) => c === 'ok');
    return reply.code(healthy ? 200 : 503).send({ status: healthy ? 'ok' : 'degraded', checks });
  });

  const auth = createAuthHelpers(sessions, config);
  const identityService = createIdentityService(prisma);
  const ladderService = createLadderService(prisma);
  const profilesService = createProfilesService(prisma, identityService);
  const ordersService = createOrdersService({
    prisma,
    identity: identityService,
    ladder: ladderService,
  });
  const reviewsService = createReviewsService({ prisma, identity: identityService });
  const antifraudService = createAntifraudService({
    prisma,
    ladder: ladderService,
    marketplace: ordersService,
  });
  const groupsService = createGroupsService({
    prisma,
    identity: identityService,
    ladder: ladderService,
  });
  const communityService = createCommunityService({
    prisma,
    identity: identityService,
    groups: groupsService,
  });
  const notificationsService = createNotificationsService({ prisma, identity: identityService });

  await app.register(identityRoutes({ service: identityService, sessions, auth, config }), {
    prefix: '/api/v1',
  });
  await app.register(
    marketplaceRoutes({
      profiles: profilesService,
      orders: ordersService,
      reviews: reviewsService,
      ladder: ladderService,
      auth,
    }),
    { prefix: '/api/v1' },
  );
  await app.register(ladderRoutes({ ladder: ladderService, auth }), { prefix: '/api/v1' });
  await app.register(antifraudRoutes({ antifraud: antifraudService, auth }), {
    prefix: '/api/v1',
  });
  await app.register(groupsRoutes({ groups: groupsService, auth }), { prefix: '/api/v1' });
  await app.register(communityRoutes({ community: communityService, auth }), {
    prefix: '/api/v1',
  });
  await app.register(notificationsRoutes({ notifications: notificationsService, auth }), {
    prefix: '/api/v1',
  });

  // Socket.IO musi być podpięty po gotowości serwera HTTP (app.server istnieje
  // po app.ready()). Realtime to tylko sygnał (ADR-007) — patrz shared/realtime.
  await app.ready();
  const realtime = createRealtime(app.server, sessions, config);

  return {
    app,
    prisma,
    redis,
    realtime,
    async close() {
      await realtime.close();
      await app.close();
      await prisma.$disconnect();
      redis.disconnect();
    },
  };
}

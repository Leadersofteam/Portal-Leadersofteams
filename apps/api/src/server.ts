import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { FastifyBaseLogger, FastifyError, FastifyInstance } from 'fastify';

import { antifraudRoutes, createAntifraudService } from './modules/antifraud/index';
import {
  communityRoutes,
  createCommunityAccountData,
  createCommunityService,
} from './modules/community/index';
import { createFilesAccountData, createFilesService, filesRoutes } from './modules/files/index';
import { createGroupsAccountData, createGroupsService, groupsRoutes } from './modules/groups/index';
import { createIdentityService, identityRoutes } from './modules/identity/index';
import { createLadderService, ladderRoutes } from './modules/ladder/index';
import {
  createListingsAccountData,
  createListingsService,
  listingsRoutes,
} from './modules/listings/index';
import {
  createMarketplaceAccountData,
  createOrdersService,
  createProfilesService,
  createReviewsService,
  marketplaceRoutes,
} from './modules/marketplace/index';
import { createNotificationsService, notificationsRoutes } from './modules/notifications/index';
import { createAuthHelpers } from './shared/auth';
import { createCache } from './shared/cache';
import type { AppConfig } from './shared/config';
import { createPrisma } from './shared/db';
import type { PrismaClient } from './shared/db';
import { DomainError } from './shared/errors';
import { createLogger } from './shared/logger';
import { createMailService } from './shared/mail';
import { createTurnstileVerifier } from './shared/turnstile';
import { createRealtime } from './shared/realtime';
import type { Realtime } from './shared/realtime';
import { createRedis } from './shared/redis';
import type { Redis } from './shared/redis';
import { createSessionStore } from './shared/session';
import { createSocialAccountData, createSocialService, socialRoutes } from './modules/social/index';

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
  // Upload obrazów (moduł files) — limit rozmiaru egzekwowany już na transporcie.
  await app.register(multipart, {
    limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1 },
  });
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
  const cache = createCache(redis);
  const mail = createMailService(
    {
      mailEnabled: config.mailEnabled,
      brevoApiKey: config.BREVO_API_KEY,
      mailFrom: config.MAIL_FROM,
      mailFromName: config.MAIL_FROM_NAME,
    },
    (event, data) => logger.info(data, event),
  );
  const turnstile = createTurnstileVerifier(
    { turnstileEnabled: config.turnstileEnabled, secretKey: config.TURNSTILE_SECRET_KEY },
    (event, data) => logger.info(data, event),
  );
  const filesService = createFilesService(prisma, {
    uploadsDir: config.UPLOADS_DIR,
    maxUploadBytes: config.MAX_UPLOAD_BYTES,
  });
  const identityService = createIdentityService(prisma, {
    sessions,
    // RODO (D6): każdy moduł anonimizuje/eksportuje własne tabele (ADR-002).
    accountModules: [
      createMarketplaceAccountData(prisma),
      createGroupsAccountData(prisma),
      createCommunityAccountData(prisma),
      createFilesAccountData(prisma, filesService),
      createListingsAccountData(prisma),
      createSocialAccountData(prisma),
    ],
    mail,
    appBaseUrl: config.APP_BASE_URL,
  });
  const ladderService = createLadderService(prisma);
  const profilesService = createProfilesService(prisma, identityService, filesService);
  const ordersService = createOrdersService({
    prisma,
    identity: identityService,
    ladder: ladderService,
    cache,
    redis,
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
    cache,
    redis,
  });
  const communityService = createCommunityService({
    prisma,
    identity: identityService,
    groups: groupsService,
    redis,
  });
  const notificationsService = createNotificationsService({ prisma, identity: identityService });
  const socialService = createSocialService({
    prisma,
    identity: identityService,
    ladder: ladderService,
  });
  const listingsService = createListingsService({
    prisma,
    identity: identityService,
    orders: ordersService,
    files: filesService,
    redis,
  });

  await app.register(identityRoutes({ service: identityService, sessions, auth, turnstile, config }), {
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
  await app.register(filesRoutes({ files: filesService, auth, identity: identityService }), {
    prefix: '/api/v1',
  });
  await app.register(socialRoutes({ social: socialService, auth }), { prefix: '/api/v1' });
  await app.register(
    listingsRoutes({
      listings: listingsService,
      ladder: ladderService,
      reviews: reviewsService,
      identity: identityService,
      auth,
    }),
    { prefix: '/api/v1' },
  );

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

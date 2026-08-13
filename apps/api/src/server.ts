import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { FastifyBaseLogger, FastifyError, FastifyInstance } from 'fastify';

import { analyticsRoutes, createAnalyticsService } from './modules/analytics/index';
import { antifraudRoutes, createAntifraudService } from './modules/antifraud/index';
import {
  communityRoutes,
  createCommunityAccountData,
  createCommunityModerationSubject,
  createCommunityService,
} from './modules/community/index';
import { createFilesAccountData, createFilesService, filesRoutes } from './modules/files/index';
import {
  createGroupsAccountData,
  createGroupsModerationSubject,
  createGroupsService,
  groupsRoutes,
} from './modules/groups/index';
import { createIdentityService, identityRoutes } from './modules/identity/index';
import { createLadderService, ladderRoutes } from './modules/ladder/index';
import {
  createListingsAccountData,
  createListingsService,
  listingsRoutes,
} from './modules/listings/index';
import {
  createMarketplaceAccountData,
  createMarketplaceModerationSubject,
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
import { readWorkerHeartbeat } from './shared/heartbeat';
import { createHumancheck } from './shared/humancheck';
import { createLogger } from './shared/logger';
import { createMailService } from './shared/mail';
import { createRealtime } from './shared/realtime';
import type { Realtime } from './shared/realtime';
import { createRedis } from './shared/redis';
import type { Redis } from './shared/redis';
import { createSessionStore } from './shared/session';
import { createSearchService, searchRoutes } from './modules/search/index';
import {
  createSocialAccountData,
  createSocialModerationSubject,
  createSocialService,
  socialRoutes,
} from './modules/social/index';

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

  const filesService = createFilesService(prisma, {
    uploadsDir: config.UPLOADS_DIR,
    maxUploadBytes: config.MAX_UPLOAD_BYTES,
  });
  // Głośno przy starcie: łatwiej zauważyć w logach deployu niż w /healthz.
  void filesService.checkWritable().then((ok) => {
    if (!ok) {
      logger.error(
        { uploadsDir: config.UPLOADS_DIR },
        'Katalog uploadów NIE JEST zapisywalny — wgrywanie zdjęć będzie zwracać 500',
      );
    }
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
    // Puls workera jest INFORMACYJNY i świadomie NIE wchodzi do `checks`,
    // bo `checks` decyduje o kodzie 200/503, który czyta healthcheck kontenera.
    // Gdyby śmierć workera czerwieniła /healthz, Docker restartowałby ZDROWE api,
    // a Traefik wyrzucałby je z puli — awaria kolejki zamieniłaby się w awarię
    // portalu. Worker ma własny healthcheck oparty na tym samym kluczu.
    const worker = await readWorkerHeartbeat(redis);
    // Zapisywalność uploadów też jest INFORMACYJNA, nie w `checks`: gdy wolumen
    // ma złe prawa, cała reszta Portalu działa i nie ma powodu wyrzucać api
    // z puli Traefika. Ale MUSI być widoczna — awaria z 13.08 objawiała się
    // wyłącznie błędem 500 w chwili, gdy ktoś próbował wgrać zdjęcie.
    const uploads = (await filesService.checkWritable()) ? 'ok' : 'fail';
    return reply
      .code(healthy ? 200 : 503)
      .send({ status: healthy ? 'ok' : 'degraded', checks, worker, uploads });
  });

  const auth = createAuthHelpers(sessions, config);
  const cache = createCache(redis);
  const mail = createMailService(
    {
      mailEnabled: config.mailEnabled,
      smtpHost: config.SMTP_HOST,
      smtpPort: config.SMTP_PORT,
      smtpUser: config.SMTP_USER,
      smtpPass: config.SMTP_PASS,
      smtpSecure: config.SMTP_SECURE,
      mailFrom: config.MAIL_FROM,
      mailFromName: config.MAIL_FROM_NAME,
    },
    (event, data) => logger.info(data, event),
  );
  // Bramka człowieka na naszym Redisie — bez Cloudflare i bez żadnego innego
  // dostawcy po API (decyzja właściciela 2026-08-13).
  const humancheck = createHumancheck(redis, config.humancheckEnabled);
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
    files: filesService,
    redis,
  });
  const listingsService = createListingsService({
    prisma,
    identity: identityService,
    orders: ordersService,
    files: filesService,
    redis,
  });

  // Antifraud budowany PO modułach treści: dostaje od nich podgląd i ukrywanie
  // zgłoszonych rzeczy (S12), bo sam nie ma prawa czytać ich tabel (ADR-002).
  // Wzorzec jak accountModules w RODO wyżej.
  const antifraudService = createAntifraudService({
    prisma,
    ladder: ladderService,
    marketplace: ordersService,
    subjects: [
      createSocialModerationSubject(prisma, identityService),
      createGroupsModerationSubject(prisma, identityService),
      createCommunityModerationSubject(prisma, identityService),
      // ORDER celowo bez akcji „ukryj" — patrz marketplace/moderation.ts.
      createMarketplaceModerationSubject(prisma, identityService),
    ],
  });

  await app.register(
    identityRoutes({ service: identityService, sessions, auth, humancheck, config }),
    {
      prefix: '/api/v1',
    },
  );
  await app.register(
    marketplaceRoutes({
      identity: identityService,
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

  // Wyszukiwarka globalna: komponuje publiczne API pięciu modułów, nie dotyka
  // ich tabel (ADR-002). Cache + rate limit są tu obowiązkowe — patrz routes.ts.
  const searchService = createSearchService({
    listings: listingsService,
    orders: ordersService,
    profiles: profilesService,
    community: communityService,
    social: socialService,
    identity: identityService,
    ladder: ladderService,
    cache,
  });
  await app.register(searchRoutes({ search: searchService, isTest: config.NODE_ENV === 'test' }), {
    prefix: '/api/v1',
  });

  // Analityka (S12): komponuje publiczne API modułów, nie dotyka ich tabel
  // (ADR-002) — dokładnie jak `search` wyżej. Kolejność źródeł = kolejność kolumn
  // w panelu, od „ilu przyszło" do „co zrobili".
  const analyticsService = createAnalyticsService({
    redis,
    sources: [
      {
        key: 'registrations',
        label: 'Rejestracje',
        countCreatedBetween: identityService.countRegistrationsBetween,
      },
      {
        key: 'orders',
        label: 'Zlecenia',
        countCreatedBetween: ordersService.countOrdersPublishedBetween,
      },
      {
        key: 'listings',
        label: 'Usługi',
        countCreatedBetween: listingsService.countListingsPublishedBetween,
      },
      { key: 'posts', label: 'Wpisy', countCreatedBetween: socialService.countPostsBetween },
      {
        key: 'threads',
        label: 'Pytania',
        countCreatedBetween: communityService.countThreadsBetween,
      },
    ],
  });
  await app.register(
    analyticsRoutes({
      analytics: analyticsService,
      redis,
      auth,
      isTest: config.NODE_ENV === 'test',
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

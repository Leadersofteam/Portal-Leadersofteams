// Rola "worker": dispatcher outboxa (MySQL → BullMQ) + konsumenci zdarzeń
// modułów + joby okresowe (dojrzewanie punktów, publikacja zaległych ocen).
//
// Rejestr subskrypcji: każdy moduł wnosi swoje handlery przez publiczne API.
// Granica anty-MLM: ladder subskrybuje wyłącznie marketplace.*/community.*
// (test w subscriptions.test.ts).
import { Queue, Worker } from 'bullmq';

import { antifraudSubscriptions, createAntifraudService } from './modules/antifraud/index';
import { createIdentityService } from './modules/identity/index';
import { createLadderService, ladderSubscriptions } from './modules/ladder/index';
import type { EventHandler } from './modules/ladder/index';
import { createOrdersService, createReviewsService } from './modules/marketplace/index';
import {
  createNotificationsService,
  notificationsSubscriptions,
} from './modules/notifications/index';
import { loadConfig } from './shared/config';
import { createPrisma } from './shared/db';
import { createLogger } from './shared/logger';
import { createMailService } from './shared/mail';
import { REALTIME_CHANNEL } from './shared/realtime';
import { createBullConnectionOptions, createRedis } from './shared/redis';

const EVENTS_QUEUE = 'events';
const POLL_INTERVAL_MS = 1000;
const MAINTENANCE_INTERVAL_MS = 5 * 60_000;
const DIGEST_INTERVAL_MS = 24 * 60 * 60_000;
const BATCH_SIZE = 50;

const config = loadConfig();
const logger = createLogger(config);
const prisma = createPrisma(config.DATABASE_URL);
const connection = createBullConnectionOptions(config.REDIS_URL);
// Publisher sygnałów realtime (ADR-007): po zapisie Notification budzi socket
// użytkownika przez kanał Redis; proces api relayuje do pokoju user:{id}.
const redisPub = createRedis(config.REDIS_URL);

// Composition root workera — te same serwisy co w API, bez warstwy HTTP.
const identity = createIdentityService(prisma);
const ladder = createLadderService(prisma);
const orders = createOrdersService({ prisma, identity, ladder });
const reviews = createReviewsService({ prisma, identity });
const antifraud = createAntifraudService({ prisma, ladder, marketplace: orders });
const notifications = createNotificationsService({
  prisma,
  identity,
  signal: async (userId) => {
    await redisPub.publish(REALTIME_CHANNEL, JSON.stringify({ userId, kind: 'notification' }));
  },
});
// Warstwa e-mail (D4) — no-op dopóki brak klucza Brevo (0 zł, ADR-009).
const mail = createMailService(
  {
    mailEnabled: config.mailEnabled,
    brevoApiKey: config.BREVO_API_KEY,
    mailFrom: config.MAIL_FROM,
    mailFromName: config.MAIL_FROM_NAME,
  },
  (event, data) => logger.info(data, event),
);

// Rejestr subskrypcji: WIELU konsumentów na jeden typ zdarzenia (np.
// marketplace.review_published konsumują i ladder, i notifications). Każdy
// konsument jest idempotentny osobno (przy retry joba odpalają się wszyscy).
// GRANICA ANTY-MLM: subskrypcje ladder pozostają ograniczone do marketplace.*/
// community.* (test subscriptions.test.ts) — notifications nie zmienia tego.
function mergeSubscriptions(
  ...maps: Array<Record<string, EventHandler>>
): Record<string, EventHandler[]> {
  const merged: Record<string, EventHandler[]> = {};
  for (const map of maps) {
    for (const [type, handler] of Object.entries(map)) {
      (merged[type] ??= []).push(handler);
    }
  }
  return merged;
}

const handlers: Record<string, EventHandler[]> = mergeSubscriptions(
  ladderSubscriptions(ladder),
  antifraudSubscriptions(antifraud),
  notificationsSubscriptions(notifications),
);

const eventsQueue = new Queue(EVENTS_QUEUE, { connection });

// Konsument: at-least-once + idempotencja (jobId = id zdarzenia outbox,
// a naliczenia punktów chroni unikat w ledgerze).
const eventsWorker = new Worker(
  EVENTS_QUEUE,
  async (job) => {
    const eventHandlers = handlers[job.name];
    if (!eventHandlers || eventHandlers.length === 0) {
      logger.debug({ type: job.name }, 'Zdarzenie bez konsumenta (na razie)');
      return;
    }
    // Wszyscy konsumenci danego typu (idempotentni) — sekwencyjnie, żeby błąd
    // jednego nie gubił kontekstu (retry joba powtórzy wszystkich bezpiecznie).
    for (const handler of eventHandlers) {
      await handler(job.data);
    }
    logger.info(
      { eventId: job.id, type: job.name, consumers: eventHandlers.length },
      'Zdarzenie przetworzone',
    );
  },
  { connection, concurrency: 5 },
);

eventsWorker.on('failed', (job, err) => {
  logger.error({ eventId: job?.id, type: job?.name, err }, 'Błąd przetwarzania zdarzenia');
});

let running = true;

async function dispatchOutboxBatch(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  for (const event of events) {
    // jobId = id zdarzenia ⇒ ponowna publikacja po awarii nie duplikuje joba.
    await eventsQueue.add(event.type, event.payload, {
      jobId: event.id,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: false,
    });
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }
  return events.length;
}

async function dispatcherLoop() {
  logger.info('Dispatcher outbox uruchomiony');
  while (running) {
    try {
      const published = await dispatchOutboxBatch();
      // Pełny batch ⇒ są zaległości, nie czekamy.
      if (published < BATCH_SIZE) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (err) {
      logger.error({ err }, 'Błąd dispatchera outbox');
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS * 5));
    }
  }
}

// Joby okresowe: pojedynczy worker (ADR-005), więc zwykły interwał wystarcza.
async function runMaintenance() {
  try {
    const matured = await ladder.maturePendingPoints();
    if (matured > 0) logger.info({ matured }, 'Punkty dojrzały (PENDING → CONFIRMED)');
  } catch (err) {
    logger.error({ err }, 'Błąd dojrzewania punktów');
  }
  try {
    const published = await reviews.publishDueReviews();
    if (published > 0) logger.info({ published }, 'Opublikowano zaległe oceny (po oknie)');
  } catch (err) {
    logger.error({ err }, 'Błąd publikacji zaległych ocen');
  }
}

const maintenanceTimer = setInterval(() => void runMaintenance(), MAINTENANCE_INTERVAL_MS);
void runMaintenance();

// Dzienny digest powiadomień (D4) — uruchamiany TYLKO gdy wysyłka włączona
// (klucz Brevo obecny). Bez klucza: zero timerów, zero wysyłki (0 zł).
async function runDigest() {
  try {
    const sent = await notifications.sendDailyDigests(mail, identity.getUserEmails);
    if (sent > 0) logger.info({ sent }, 'Wysłano dzienny digest powiadomień');
  } catch (err) {
    logger.error({ err }, 'Błąd wysyłki digestu');
  }
}
const digestTimer = mail.enabled ? setInterval(() => void runDigest(), DIGEST_INTERVAL_MS) : null;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    logger.info({ signal }, 'Zamykanie workera');
    running = false;
    clearInterval(maintenanceTimer);
    if (digestTimer) clearInterval(digestTimer);
    await eventsWorker.close();
    await eventsQueue.close();
    redisPub.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  });
}

await dispatcherLoop();

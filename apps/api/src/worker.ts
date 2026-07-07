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
import { loadConfig } from './shared/config';
import { createPrisma } from './shared/db';
import { createLogger } from './shared/logger';
import { createBullConnectionOptions } from './shared/redis';

const EVENTS_QUEUE = 'events';
const POLL_INTERVAL_MS = 1000;
const MAINTENANCE_INTERVAL_MS = 5 * 60_000;
const BATCH_SIZE = 50;

const config = loadConfig();
const logger = createLogger(config);
const prisma = createPrisma(config.DATABASE_URL);
const connection = createBullConnectionOptions(config.REDIS_URL);

// Composition root workera — te same serwisy co w API, bez warstwy HTTP.
const identity = createIdentityService(prisma);
const ladder = createLadderService(prisma);
const orders = createOrdersService({ prisma, identity, ladder });
const reviews = createReviewsService({ prisma, identity });
const antifraud = createAntifraudService({ prisma, ladder, marketplace: orders });

const handlers: Record<string, EventHandler> = {
  ...ladderSubscriptions(ladder),
  ...antifraudSubscriptions(antifraud),
};

const eventsQueue = new Queue(EVENTS_QUEUE, { connection });

// Konsument: at-least-once + idempotencja (jobId = id zdarzenia outbox,
// a naliczenia punktów chroni unikat w ledgerze).
const eventsWorker = new Worker(
  EVENTS_QUEUE,
  async (job) => {
    const handler = handlers[job.name];
    if (!handler) {
      logger.debug({ type: job.name }, 'Zdarzenie bez konsumenta (na razie)');
      return;
    }
    await handler(job.data);
    logger.info({ eventId: job.id, type: job.name }, 'Zdarzenie przetworzone');
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

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    logger.info({ signal }, 'Zamykanie workera');
    running = false;
    clearInterval(maintenanceTimer);
    await eventsWorker.close();
    await eventsQueue.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

await dispatcherLoop();

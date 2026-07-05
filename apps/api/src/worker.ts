// Rola "worker": dispatcher outboxa (MySQL → BullMQ) + konsumenci kolejek.
// W Fazie 0 jedyny konsument loguje zdarzenia — kolejne moduły (ladder,
// notifications, integration) dołożą swoich konsumentów (ADR-007).
import { Queue, Worker } from 'bullmq';

import { loadConfig } from './shared/config';
import { createPrisma } from './shared/db';
import { createLogger } from './shared/logger';
import { createBullConnectionOptions } from './shared/redis';

const EVENTS_QUEUE = 'events';
const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 50;

const config = loadConfig();
const logger = createLogger(config);
const prisma = createPrisma(config.DATABASE_URL);
const connection = createBullConnectionOptions(config.REDIS_URL);

const eventsQueue = new Queue(EVENTS_QUEUE, { connection });

// Konsument: at-least-once + idempotencja przez jobId = id zdarzenia outbox.
const eventsWorker = new Worker(
  EVENTS_QUEUE,
  async (job) => {
    logger.info({ eventId: job.id, type: job.name, payload: job.data }, 'Zdarzenie domenowe');
  },
  { connection, concurrency: 5 },
);

eventsWorker.on('failed', (job, err) => {
  logger.error({ eventId: job?.id, err }, 'Błąd przetwarzania zdarzenia');
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

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    logger.info({ signal }, 'Zamykanie workera');
    running = false;
    await eventsWorker.close();
    await eventsQueue.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

await dispatcherLoop();

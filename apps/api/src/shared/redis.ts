import { Redis } from 'ioredis';

export function createRedis(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    lazyConnect: false,
    enableReadyCheck: true,
  });
}

// BullMQ dostaje opcje (nie instancję) i sam zarządza swoimi połączeniami —
// unika to konfliktu wersji ioredis i wymogu maxRetriesPerRequest: null.
export interface BullConnectionOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
  maxRetriesPerRequest: null;
}

export function createBullConnectionOptions(redisUrl: string): BullConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    password: url.password || undefined,
    username: url.username || undefined,
    db: url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : undefined,
    maxRetriesPerRequest: null,
  };
}

export type { Redis };

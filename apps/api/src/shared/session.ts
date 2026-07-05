import { randomBytes } from 'node:crypto';

import type { SessionUser } from '@lot/contracts';

import type { Redis } from './redis';

const SESSION_PREFIX = 'session:';

export interface SessionStore {
  create(user: SessionUser): Promise<string>;
  get(sessionId: string): Promise<SessionUser | null>;
  destroy(sessionId: string): Promise<void>;
}

export function createSessionStore(redis: Redis, ttlSeconds: number): SessionStore {
  return {
    async create(user) {
      const sessionId = randomBytes(32).toString('base64url');
      await redis.set(SESSION_PREFIX + sessionId, JSON.stringify(user), 'EX', ttlSeconds);
      return sessionId;
    },

    async get(sessionId) {
      if (!sessionId) return null;
      const raw = await redis.get(SESSION_PREFIX + sessionId);
      if (!raw) return null;
      // Przedłużenie sesji przy aktywności (sliding expiration).
      await redis.expire(SESSION_PREFIX + sessionId, ttlSeconds);
      return JSON.parse(raw) as SessionUser;
    },

    async destroy(sessionId) {
      if (!sessionId) return;
      await redis.del(SESSION_PREFIX + sessionId);
    },
  };
}

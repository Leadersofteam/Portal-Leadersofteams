import { randomBytes } from 'node:crypto';

import type { SessionUser } from '@lot/contracts';

import type { Redis } from './redis';

const SESSION_PREFIX = 'session:';
// Indeks odwrotny userId → zbiór sesji, do unieważnienia WSZYSTKICH sesji konta
// (RODO: usunięcie konta natychmiast wylogowuje wszędzie).
const USER_SESSIONS_PREFIX = 'user_sessions:';

export interface SessionStore {
  create(user: SessionUser): Promise<string>;
  get(sessionId: string): Promise<SessionUser | null>;
  destroy(sessionId: string): Promise<void>;
  destroyAllForUser(userId: string): Promise<void>;
}

export function createSessionStore(redis: Redis, ttlSeconds: number): SessionStore {
  return {
    async create(user) {
      const sessionId = randomBytes(32).toString('base64url');
      await redis.set(SESSION_PREFIX + sessionId, JSON.stringify(user), 'EX', ttlSeconds);
      // Dopisz do indeksu użytkownika (TTL nieco dłuższy niż sesji — porządkowo).
      await redis.sadd(USER_SESSIONS_PREFIX + user.id, sessionId);
      await redis.expire(USER_SESSIONS_PREFIX + user.id, ttlSeconds * 2);
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

    async destroyAllForUser(userId) {
      const setKey = USER_SESSIONS_PREFIX + userId;
      const sessionIds = await redis.smembers(setKey);
      if (sessionIds.length > 0) {
        await redis.del(...sessionIds.map((id) => SESSION_PREFIX + id));
      }
      await redis.del(setKey);
    },
  };
}

// Test prymitywu limitu (D7) na realnym Redisie: licznik okna + próg 429.
import { afterAll, describe, expect, it } from 'vitest';

import { enforceQuota, isFreshAccount } from './quota';
import { createRedis } from './redis';

const hasRedis = Boolean(process.env.REDIS_URL);
const run = Date.now();

describe('isFreshAccount', () => {
  it('konto młodsze niż 7 dni jest świeże, starsze — nie', () => {
    const now = new Date('2026-07-09T00:00:00Z');
    expect(isFreshAccount(new Date('2026-07-05T00:00:00Z'), now)).toBe(true);
    expect(isFreshAccount(new Date('2026-06-01T00:00:00Z'), now)).toBe(false);
    expect(isFreshAccount(null, now)).toBe(true); // brak daty → ostrożnie
  });
});

describe.skipIf(!hasRedis)('enforceQuota', () => {
  const redis = createRedis(process.env.REDIS_URL!);
  const userId = `quota-user-${run}`;
  const limit = { action: `test-${run}`, limit: 3, windowSeconds: 60 };

  afterAll(async () => {
    await redis.del(`quota:${limit.action}:${userId}`);
    redis.disconnect();
  });

  it('przepuszcza do limitu, potem rzuca 429', async () => {
    await enforceQuota(redis, userId, limit); // 1
    await enforceQuota(redis, userId, limit); // 2
    await enforceQuota(redis, userId, limit); // 3
    await expect(enforceQuota(redis, userId, limit)).rejects.toMatchObject({
      code: 'RATE_LIMITED_FRESH_ACCOUNT',
      statusCode: 429,
    });
  });
});

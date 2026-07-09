// Cache-aside na Redis (D3, ADR-007) dla publicznych, drogich odczytów.
// NIGDY dla /me/ladder ani danych punktowych — bilans/poziom zawsze świeży.
//
// Inwalidacja przez WERSJĘ namespace: klucz zawiera licznik cache:ver:{ns};
// zmiana danych robi INCR licznika, więc wszystkie stare klucze stają się
// nieosiągalne (i wygasają po TTL). Brak SCAN/pattern-delete — O(1), poprawne
// przy nieograniczonej liczbie kombinacji filtrów.
import { createHash } from 'node:crypto';

import type { Redis } from './redis';

export interface Cache {
  getOrSet<T>(
    ns: string,
    params: unknown,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T>;
  bump(ns: string): Promise<void>;
}

export function createCache(redis: Redis): Cache {
  async function version(ns: string): Promise<string> {
    return (await redis.get(`cache:ver:${ns}`)) ?? '0';
  }

  return {
    async getOrSet<T>(ns: string, params: unknown, ttlSeconds: number, loader: () => Promise<T>) {
      const ver = await version(ns);
      const hash = createHash('sha1').update(JSON.stringify(params)).digest('hex');
      const key = `cache:${ns}:v${ver}:${hash}`;
      const cached = await redis.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
      const value = await loader();
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return value;
    },

    async bump(ns) {
      await redis.incr(`cache:ver:${ns}`);
    },
  };
}

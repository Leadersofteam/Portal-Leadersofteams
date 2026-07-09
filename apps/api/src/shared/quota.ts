// Limity publikacji dla świeżych kont (D7, R-03/R-13) — bariera anty-spam przy
// otwartej rejestracji. To NIE jest reguła punktowa (anty-MLM nietknięte): czysty
// licznik czynności w oknie, egzekwowany tylko dla kont młodszych niż próg.
import { DomainError } from './errors';
import type { Redis } from './redis';

// Konta starsze niż to nie podlegają limitom świeżego konta.
export const FRESH_ACCOUNT_DAYS = 7;

export interface QuotaLimit {
  action: string;
  limit: number;
  windowSeconds: number;
}

// Domyślne dzienne limity dla świeżych kont (kalibracja właściciela — sensowne
// wartości startowe; nie dotykają punktacji).
export const FRESH_ACCOUNT_LIMITS = {
  order_publish: { action: 'order_publish', limit: 10, windowSeconds: 86_400 },
  group_post: { action: 'group_post', limit: 10, windowSeconds: 86_400 },
  qa_thread: { action: 'qa_thread', limit: 10, windowSeconds: 86_400 },
  qa_answer: { action: 'qa_answer', limit: 30, windowSeconds: 86_400 },
} as const satisfies Record<string, QuotaLimit>;

export function isFreshAccount(createdAt: Date | null, now = new Date()): boolean {
  if (!createdAt) return true; // brak daty → traktuj ostrożnie jak świeże
  return now.getTime() - createdAt.getTime() < FRESH_ACCOUNT_DAYS * 86_400_000;
}

// Wygodny wrapper dla serwisów: egzekwuj limit TYLKO dla świeżego konta.
// Bez redis (np. w części testów) — no-op (limit nieaktywny).
export async function enforceFreshAccountQuota(
  redis: Redis | undefined,
  getCreatedAt: (userId: string) => Promise<Date | null>,
  userId: string,
  limit: QuotaLimit,
): Promise<void> {
  // W testach limity są zdjęte (jak globalny rate-limit w server.ts) — suity
  // dzielą Redis i wielokrotnie publikują tym samym świeżym kontem. Sam prymityw
  // enforceQuota jest testowany bezpośrednio (quota.test.ts).
  if (!redis || process.env.NODE_ENV === 'test') return;
  const createdAt = await getCreatedAt(userId);
  if (!isFreshAccount(createdAt)) return;
  await enforceQuota(redis, userId, limit);
}

// Atomowy licznik okna: INCR + EXPIRE przy pierwszym trafieniu. Przekroczenie →
// 429. Utrata Redisa nie blokuje publikacji (fail-open — dostępność > twardość).
export async function enforceQuota(
  redis: Redis,
  userId: string,
  { action, limit, windowSeconds }: QuotaLimit,
): Promise<void> {
  const key = `quota:${action}:${userId}`;
  let count: number;
  try {
    count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
  } catch {
    return; // fail-open: nie karzemy użytkownika za awarię cache
  }
  if (count > limit) {
    throw new DomainError(
      'RATE_LIMITED_FRESH_ACCOUNT',
      `Nowe konta mają dzienny limit tej czynności (${limit}). Limit odnowi się wkrótce — dojrzałe konta nie mają tego ograniczenia.`,
      429,
    );
  }
}

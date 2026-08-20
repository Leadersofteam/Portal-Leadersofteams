// Fetch po stronie serwera (RSC) z przekazaniem cookies sesji do API.
import { cookies } from 'next/headers';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

/**
 * Fetch danych PUBLICZNYCH bez cookies — dla stron, które mają się
 * prerenderować. `cookies()` w serverApi() czyni całą trasę dynamiczną,
 * przez co gość na landingu dostawał najpierw skeleton z loading.tsx
 * (podmiana treści ~1 s po wejściu — zmierzone w PD1, stąd CLS stopki).
 * ISR: dane odświeżają się co `revalidate` sekund.
 */
export async function publicApi<T>(path: string, revalidate = 300): Promise<T | null> {
  const res = await fetch(`${apiUrl}/api/v1${path}`, { next: { revalidate } }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as T;
}

export async function serverApi<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/v1${path}`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as T;
}

// Fetch po stronie serwera (RSC) z przekazaniem cookies sesji do API.
import { cookies } from 'next/headers';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

export async function serverApi<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/v1${path}`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as T;
}

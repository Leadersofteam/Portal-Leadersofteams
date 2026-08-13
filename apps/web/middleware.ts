import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Zliczanie odsłon (S12) — 0 zł, bez cookies, bez skryptu w przeglądarce.
//
// DLACZEGO tutaj, a nie w API: strony są SSR-owane, a jedno wejście użytkownika
// potrafi wywołać kilka zapytań do API — licząc po stronie API liczylibyśmy
// zapytania, nie odsłony. Middleware jest jedynym miejscem, które widzi realną
// ścieżkę strony dokładnie raz na nawigację.
//
// Normalizacja i biała lista ścieżek żyją po stronie API (shared/analytics.ts) —
// tutaj świadomie nie ma logiki poza odsianiem tego, co odsłoną nie jest.

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

// Ruch automatyczny zawyżałby każdą liczbę, a przy ~0 realnych kontach zrobiłby
// z panelu fikcję. Prosty filtr po UA nie jest szczelny i nie musi być — ma
// odsiać uczciwie przedstawiające się crawlery, nie walczyć z podszywaniem.
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|headless/i;

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const userAgent = request.headers.get('user-agent') ?? '';
  if (BOT_UA.test(userAgent)) return response;

  // Tylko realne nawigacje. Prefetch Next.js (`next/link` w tle) nie jest
  // odsłoną — bez tego warunku sam najazd kursorem na menu podbijałby licznik.
  if (request.headers.get('next-router-prefetch') === '1') return response;
  if (request.headers.get('purpose') === 'prefetch') return response;

  // Strzał „wystrzel i zapomnij". Nie ma `await`: licznik NIE MA PRAWA opóźnić
  // ani wywrócić renderu strony. Timeout jest tu drugą linią obrony na wypadek,
  // gdyby api nie odpowiadało — brak liczby jest zawsze lepszy niż wolna strona.
  void fetch(`${apiUrl}/api/v1/analytics/hit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: request.nextUrl.pathname }),
    signal: AbortSignal.timeout(500),
    cache: 'no-store',
  }).catch(() => {
    /* statystyka nie jest funkcją portalu — cisza jest właściwą reakcją */
  });

  return response;
}

export const config = {
  // Wykluczamy wszystko, co nie jest stroną: proxy do API, zasoby Next.js,
  // service worker, manifest i pliki z rozszerzeniem (ikony, obrazy, robots).
  matcher: ['/((?!api|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|.*\\.[\\w]+$).*)'],
};

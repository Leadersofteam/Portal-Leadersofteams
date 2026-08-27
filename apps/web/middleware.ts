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

// Nazwa cookie sesji. Źródłem prawdy jest API (`apps/api/src/shared/config.ts`,
// SESSION_COOKIE_NAME) — web nie ma na to env-a i celowo go nie dodajemy:
// każda zmienna środowiskowa weba jest zapiekana w buildzie (mina MINY.md),
// więc env dawałby złudzenie konfigurowalności, której nie ma.
const SESSION_COOKIE = 'lot_sid';

// Ruch automatyczny zawyżałby każdą liczbę, a przy ~0 realnych kontach zrobiłby
// z panelu fikcję. Prosty filtr po UA nie jest szczelny i nie musi być — ma
// odsiać uczciwie przedstawiające się crawlery, nie walczyć z podszywaniem.
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|headless/i;

export function middleware(request: NextRequest) {
  // Zalogowany na „/" ląduje w /panel — landing sprzedażowy ma sens raz
  // (ta sama decyzja co `start_url: /feed` w manifeście PWA). Bez tego
  // klik w logo pokazywał zalogowanemu stronę z „Zaloguj się" w stopce,
  // co wyglądało jak wylogowanie, choć sesja żyła.
  //
  // DLACZEGO tu, a nie w `app/page.tsx`: odczyt cookies na stronie zabiłby
  // prerender landingu (PD1 zmierzył koszt — patrz `lib/server-api.ts`).
  // Sprawdzamy OBECNOŚĆ cookie, nie ważność — walidacja wymagałaby Redisa,
  // a martwy cookie i tak kończy w /panel → redirect('/logowanie'), bez pętli
  // (`/logowanie` nie przekierowuje z powrotem). Redirect 307, nigdy 308:
  // stan zalogowania się zmienia, przeglądarka nie może go zapamiętać na stałe.
  //
  // Furtka `/?widok=landing` zostawia landing osiągalnym dla zalogowanego
  // (właściciel pokazuje stronę ze swojego konta). Return PRZED strzałem
  // analityki: przekierowana odsłona „/" nie jest obejrzeniem landingu —
  // follow-up przeglądarki policzy się raz, jako `/panel`.
  // Origin przekierowania budujemy z nagłówka HOST żądania, nie z `request.url`:
  // ten bywa rekonstruowany z hosta PROCESU (e2e złapało przeskok
  // 127.0.0.1 → localhost gubiący host-only cookie; za Traefikiem groziłby
  // wyciek hosta wewnętrznego). Relatywny Location odpada — runtime Next
  // parsuje nagłówek przez new URL() i na względnym rzuca ERR_INVALID_URL (500).
  if (
    request.nextUrl.pathname === '/' &&
    request.cookies.has(SESSION_COOKIE) &&
    request.nextUrl.searchParams.get('widok') !== 'landing'
  ) {
    // Runtime Next przepisuje `host` na host PROCESU (localhost) — oryginał
    // z przeglądarki niesie `x-forwarded-host`, który Next ustawia sam, a za
    // Traefikiem i tak przychodzi z zewnątrz.
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const proto =
      request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
    const origin = host ? `${proto}://${host}` : request.nextUrl.origin;
    return NextResponse.redirect(`${origin}/panel`, 307);
  }

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
  //
  // `healthz` wykluczamy TUTAJ, a nie przez pominięcie w białej liście po
  // stronie API (S18). Gdyby sonda przechodziła przez middleware, wpadłaby do
  // wiadra `/inne` — przenieślibyśmy kłamstwo z `/` na `/inne` zamiast je
  // usunąć. NIE USUWAJ tego wykluczenia: 15-sekundowy healthcheck kontenera
  // to 5760 sztucznych odsłon na dobę przy 2–3 realnych na stronę.
  matcher: [
    '/((?!api|healthz|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|.*\\.[\\w]+$).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { decydujWyglad } from '@/lib/v17-routing';

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

// Flaga wyglądu V17 — „Światło” (feed/profil/drabinka, od 25.11.2026) i „Rynek” (zlecenia/usługi, od 26.11.2026) są
// DOMYŚLNIE WŁĄCZONE. Reguły: lib/v17-routing.ts (czysta funkcja, testowana w e2e/v17-routing.spec.ts).
// `?wyglad=off` zapisuje ciasteczko „off” (rok) — stary wygląd jako awaryjne wyjście; `?wyglad=v17` zdejmuje opt-out.
// Wycofanie dla wszystkich = zmienić warunek w decydujWyglad i przebudować web.
// DLACZEGO rewrite w middleware, a nie cookies() na stronach: odczyt cookies w page.tsx
// uczyniłby dynamiczną /drabinkę nawet z wyłączoną flagą (mina PD1 — patrz lib/server-api.ts).
const V17_FLAG = 'lot_wyglad';

function withFlagCookie(response: NextResponse, set?: 'v17' | 'off'): NextResponse {
  if (set === 'v17') {
    response.cookies.set(V17_FLAG, 'v17', { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
  } else if (set === 'off') {
    // Przy domyślnie włączonej fladze samo usunięcie ciasteczka znów pokazałoby V17.
    response.cookies.set(V17_FLAG, 'off', { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
  }
  return response;
}

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

  const path = request.nextUrl.pathname;
  const decyzja = decydujWyglad(
    path,
    request.nextUrl.searchParams.get('wyglad'),
    request.cookies.get(V17_FLAG)?.value,
  );
  const response = decyzja.rewrite
    ? NextResponse.rewrite(new URL(`/v17${path}${request.nextUrl.search}`, request.url))
    : NextResponse.next();
  withFlagCookie(response, decyzja.set);

  const userAgent = request.headers.get('user-agent') ?? '';
  if (BOT_UA.test(userAgent)) return response;

  // Tylko realne nawigacje. Prefetch Next.js (`next/link` w tle) nie jest
  // odsłoną — bez tego warunku sam najazd kursorem na menu podbijałby licznik.
  if (request.headers.get('next-router-prefetch') === '1') return response;
  if (request.headers.get('purpose') === 'prefetch') return response;

  // Strzał „wystrzel i zapomnij". Nie ma `await`: licznik NIE MA PRAWA opóźnić
  // ani wywrócić renderu strony. Timeout jest tu drugą linią obrony na wypadek,
  // gdyby api nie odpowiadało — brak liczby jest zawsze lepszy niż wolna strona.
  // PL0: skąd wejście. Idzie surowy nagłówek Referer i `utm_source`; API
  // sprowadza je do samego hosta / etykiety kampanii i nie zapisuje nic więcej
  // (shared/analytics.ts — tam też jest bariera pamięciowa).
  const referrer = request.headers.get('referer') ?? undefined;
  const utm = request.nextUrl.searchParams.get('utm_source') ?? undefined;
  void fetch(`${apiUrl}/api/v1/analytics/hit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: request.nextUrl.pathname, referrer, utm }),
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

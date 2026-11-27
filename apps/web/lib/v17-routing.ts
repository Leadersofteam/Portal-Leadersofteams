// Decyzja „czy przepisać żądanie na /v17/…” — czysta funkcja, żeby middleware i test
// (e2e/v17-routing.spec.ts) używały tego samego kodu.
//
// P0 („Światło”: feed, profil, drabinka) jest domyślnie włączone od 25.11, P1 („Rynek”: zlecenia, usługi) od 26.11
// (Maciej: „Tak, włącz P1”). Jedno wyjście awaryjne dla obu: `?wyglad=off`. Kolejna paczka V17 przed akceptacją dostaje
// OSOBNĄ listę z opt-inem — dopisana tutaj byłaby publiczna od razu po wdrożeniu.
// Reszta P1 („formularze, branże, wątki, firma”, makieta zaakceptowana 27.11) stoi na V17_OPTIN_ROUTES: działa tylko
// po `?wyglad=v17` (ciasteczko), bez flagi widać dzisiejsze ekrany. Włączenie dla wszystkich = osobna decyzja Macieja.

export const V17_ROUTES = [
  /^\/feed$/,
  /^\/drabinka$/,
  /^\/profil\/[^/]+$/,
  /^\/zlecenia$/,
  /^\/zlecenia\/(?!nowe$|branza$)[^/]+$/,
  /^\/uslugi$/,
  /^\/uslugi\/(?!nowa$|branza$)[^/]+$/,
];

export const V17_OPTIN_ROUTES = [
  /^\/zlecenia\/nowe$/,
  /^\/zlecenia\/branza\/[^/]+$/,
  /^\/uslugi\/nowa$/,
  /^\/uslugi\/branza\/[^/]+$/,
  /^\/uslugi\/[^/]+\/edytuj$/,
  /^\/oferty\/[^/]+$/,
  /^\/zapytania\/[^/]+$/,
  /^\/porownanie\/[^/]+$/,
  /^\/firmy\/[^/]+$/,
  /^\/firma\/nowa$/,
  /^\/dla-firm$/,
];

export type WygladFlaga = 'v17' | 'off';

export interface WygladDecyzja {
  /** Czy przepisać na /v17/…; false = stary wygląd. */
  rewrite: boolean;
  /** Ciasteczko do ustawienia na odpowiedzi (tylko gdy użytkownik jawnie zmienił wybór parametrem). */
  set?: WygladFlaga;
}

export function decydujWyglad(
  path: string,
  query: string | null,
  cookie: string | undefined,
): WygladDecyzja {
  const set: WygladFlaga | undefined = query === 'v17' || query === 'off' ? query : undefined;
  const efektywna = set ?? cookie;
  // P0 i P1: domyślnie ON, wyłącza tylko jawne „off”. Nowa paczka: tylko jawne „v17”.
  const rewrite =
    (efektywna !== 'off' && V17_ROUTES.some((re) => re.test(path))) ||
    (efektywna === 'v17' && V17_OPTIN_ROUTES.some((re) => re.test(path)));
  return { rewrite, ...(set ? { set } : {}) };
}

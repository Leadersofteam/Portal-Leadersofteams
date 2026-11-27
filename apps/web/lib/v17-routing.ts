// Decyzja „czy przepisać żądanie na /v17/…” — czysta funkcja, żeby middleware i test
// (e2e/v17-routing.spec.ts) używały tego samego kodu.
//
// P0 („Światło”: feed, profil, drabinka) jest domyślnie włączone od 25.11, P1 („Rynek”: zlecenia, usługi) od 26.11
// (Maciej: „Tak, włącz P1”). Jedno wyjście awaryjne dla obu: `?wyglad=off`. Kolejna paczka V17 przed akceptacją dostaje
// OSOBNĄ listę z opt-inem — dopisana tutaj byłaby publiczna od razu po wdrożeniu.
// `/zlecenia/nowe`, `/zlecenia/branza/*`, `/uslugi/nowa`, `/uslugi/branza/*`, `/uslugi/<slug>/edytuj` celowo NIE
// pasują: nie mają makiety, zostają w starym wyglądzie.

export const V17_ROUTES = [
  /^\/feed$/,
  /^\/drabinka$/,
  /^\/profil\/[^/]+$/,
  /^\/zlecenia$/,
  /^\/zlecenia\/(?!nowe$|branza$)[^/]+$/,
  /^\/uslugi$/,
  /^\/uslugi\/(?!nowa$|branza$)[^/]+$/,
];

// P6 (strona główna, /start, dokumenty, wypis) i P5 (logowanie, rejestracja, hasło) czekają na akceptację
// wdrożonego wyglądu: WYŁĄCZNIE opt-in `?wyglad=v17p6` (ciasteczko lot_wyglad=v17p6). Bez niego te adresy
// zostają w dzisiejszym wyglądzie. Włączenie dla wszystkich = przenieść listę do domyślnej decyzji.
export const V17P6_ROUTES = [
  /^\/$/,
  /^\/start$/,
  /^\/regulamin$/,
  /^\/prywatnosc$/,
  /^\/wypis-digest$/,
  /^\/logowanie$/,
  /^\/rejestracja$/,
  /^\/nie-pamietam-hasla$/,
  /^\/reset-hasla$/,
];

export type WygladFlaga = 'v17' | 'off' | 'v17p6';

export interface WygladDecyzja {
  /** Czy przepisać żądanie; false = stary wygląd. */
  rewrite: boolean;
  /** Ścieżka docelowa, gdy to paczka P6 (`/v17p6…`); brak = `/v17` + ścieżka. */
  cel?: string;
  /** Ciasteczko do ustawienia na odpowiedzi (tylko gdy użytkownik jawnie zmienił wybór parametrem). */
  set?: WygladFlaga;
}

export function decydujWyglad(
  path: string,
  query: string | null,
  cookie: string | undefined,
): WygladDecyzja {
  const set: WygladFlaga | undefined =
    query === 'v17' || query === 'off' || query === 'v17p6' ? query : undefined;
  const efektywna = set ?? cookie;
  const dodatek = set ? { set } : {};
  if (efektywna === 'v17p6' && V17P6_ROUTES.some((re) => re.test(path))) {
    return { rewrite: true, cel: path === '/' ? '/v17p6' : `/v17p6${path}`, ...dodatek };
  }
  // P0 i P1: domyślnie ON, wyłącza tylko jawne „off” (opt-in P6 ich nie gasi).
  const rewrite = efektywna !== 'off' && V17_ROUTES.some((re) => re.test(path));
  return { rewrite, ...dodatek };
}

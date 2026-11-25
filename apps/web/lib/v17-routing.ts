// Decyzja „czy przepisać żądanie na /v17/…” — czysta funkcja, żeby middleware i test
// (e2e/v17-routing.spec.ts) używały tego samego kodu.
//
// DWIE LISTY, bo dwie obietnice:
//  - P0 („Światło”: feed, profil, drabinka) jest od 25.11 domyślnie WŁĄCZONE dla wszystkich (decyzja Macieja).
//  - P1 („Rynek”: zlecenia, usługi) czeka na akceptację na prodzie. Maciej: „Włącz dla wszystkich” dotyczyło
//    WYŁĄCZNIE P0. Dopisanie tras P1 do V17_ROUTES uczyniłoby je publicznymi od razu po wdrożeniu —
//    dlatego mają osobną listę i działają tylko przy jawnym opt-inie (?wyglad=v17 albo ciasteczko lot_wyglad=v17).
//    Włączenie P1 dla wszystkich = scalić listy i zdjąć warunek opt-inu (jedna zmiana, tu).
// `/zlecenia/nowe`, `/zlecenia/branza/*`, `/uslugi/nowa`, `/uslugi/branza/*`, `/uslugi/<slug>/edytuj` celowo NIE
// pasują: nie mają makiety, zostają w starym wyglądzie.

export const V17_ROUTES = [/^\/feed$/, /^\/drabinka$/, /^\/profil\/[^/]+$/];
export const V17_P1_ROUTES = [
  /^\/zlecenia$/,
  /^\/zlecenia\/(?!nowe$|branza$)[^/]+$/,
  /^\/uslugi$/,
  /^\/uslugi\/(?!nowa$|branza$)[^/]+$/,
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
  // P0: domyślnie ON, wyłącza tylko jawne „off”.
  const p0 = efektywna !== 'off' && V17_ROUTES.some((re) => re.test(path));
  // P1: wyłącznie jawny opt-in.
  const p1 = efektywna === 'v17' && V17_P1_ROUTES.some((re) => re.test(path));
  return { rewrite: p0 || p1, ...(set ? { set } : {}) };
}

'use client';

/**
 * Motyw Portalu (P2). Ciemny jest domyślny: brak atrybutu na <html> = dark,
 * `data-theme='light'` włącza jasny. Pierwszy paint ustawia blokujący skrypt
 * w `app/layout.tsx` (THEME_BOOT — logika LUSTRZANA z tym plikiem; zmieniasz
 * jedno, zmieniasz drugie). Ten moduł obsługuje resztę życia strony:
 * przełącznik, opcję „system" z nasłuchem matchMedia i sync theme-color.
 *
 * Wybór trzyma localStorage (`lot_theme`) — świadomie NIE cookie: cookie
 * czytane serwerowo zabiłoby prerender (PD1), a motyw jest preferencją
 * urządzenia, nie konta.
 */
export type Motyw = 'dark' | 'light' | 'system';

const KLUCZ = 'lot_theme';
/* Musi zgadzać się z --bg obu motywów w globals.css i z THEME_BOOT. */
const TLO_JASNE = '#f6f7fb';
const TLO_CIEMNE = '#0a0b12';

export function odczytajMotyw(): Motyw {
  try {
    const t = localStorage.getItem(KLUCZ);
    if (t === 'light' || t === 'system') return t;
  } catch {
    /* tryb prywatny / brak storage — zostaje domyślny ciemny */
  }
  return 'dark';
}

function systemJasny(): boolean {
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

function pomaluj(jasny: boolean) {
  if (jasny) {
    document.documentElement.dataset.theme = 'light';
  } else {
    delete document.documentElement.dataset.theme;
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', jasny ? TLO_JASNE : TLO_CIEMNE);
}

let nasluch: ((e: MediaQueryListEvent) => void) | null = null;

/** Ustawia motyw, zapisuje wybór i zarządza nasłuchem systemowym. */
export function zastosujMotyw(motyw: Motyw) {
  try {
    localStorage.setItem(KLUCZ, motyw);
  } catch {
    /* brak storage — motyw zadziała do końca tej wizyty */
  }

  const media = window.matchMedia('(prefers-color-scheme: light)');
  if (nasluch) {
    media.removeEventListener('change', nasluch);
    nasluch = null;
  }
  if (motyw === 'system') {
    nasluch = (e) => pomaluj(e.matches);
    media.addEventListener('change', nasluch);
  }

  pomaluj(motyw === 'light' || (motyw === 'system' && systemJasny()));
}

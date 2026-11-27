'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Ico } from './ico';
import { Komunikat } from './karty';
import { Rama } from './rama';
import type { MenuKlucz } from './rama';

// Stan błędu ekranu V17 (error.tsx). Po błędzie React renderuje dokument od nowa po stronie klienta
// i zdejmuje atrybuty ustawione przez skrypt startowy na <html> — jasny motyw wracał do ciemnego.
// Przywracamy go z tego samego źródła co boot w layout.tsx (lot_theme), bez zmiany logiki motywu.
export function przywrocMotyw() {
  try {
    const t = localStorage.getItem('lot_theme');
    const light =
      t === 'light' || (t === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
    if (light) document.documentElement.dataset.theme = 'light';
    if (/(?:^|; )lot_wyglad=v17(?:p6)?(?:;|$)/.test(document.cookie))
      document.documentElement.dataset.wyglad = 'v17';
  } catch {
    /* brak dostępu do storage: zostaje motyw domyślny */
  }
}

export function ErrorEkranu({
  aktywny,
  szeroka,
  tytul,
  naglowek,
  reset,
}: {
  aktywny: MenuKlucz;
  szeroka?: boolean;
  tytul: string;
  naglowek: string;
  reset: () => void;
}) {
  useEffect(przywrocMotyw, []);
  return (
    <Rama aktywny={aktywny} szeroka={szeroka}>
      <div className="naglowek">
        <h1>{naglowek}</h1>
      </div>
      <Komunikat
        ikona="cloud-slash"
        tytul={tytul}
        opis="To po naszej stronie. Twoje punkty i wpisy są bezpieczne."
      >
        <button className="vbtn glowny" type="button" onClick={reset}>
          <Ico n="arrow-clockwise" />
          Spróbuj ponownie
        </button>
        <Link className="vbtn obrys" href="/feed">
          Wróć do strumienia
        </Link>
      </Komunikat>
    </Rama>
  );
}

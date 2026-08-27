'use client';

import { useEffect, useState } from 'react';

import { odczytajMotyw, zastosujMotyw, type Motyw } from '@/lib/theme';

const OPCJE: { wartosc: Motyw; etykieta: string }[] = [
  { wartosc: 'dark', etykieta: 'Ciemny' },
  { wartosc: 'light', etykieta: 'Jasny' },
  { wartosc: 'system', etykieta: 'Systemowy' },
];

/**
 * Przełącznik motywu (P2/S3). Mieszka w stopce: dostępny wszędzie i dla
 * gościa, bez zabierania miejsca w ciasnym nagłówku na 390 px (search +
 * dzwonek + hamburger) i bez ruszania pięciu slotów dolnego paska.
 *
 * Stan początkowy czytamy dopiero w efekcie — SSR nie zna localStorage,
 * a przycisk podświetlony ZANIM wiadomo, co wybrał użytkownik, kłamałby
 * (ta sama zasada co pusty slot w footer-account-links).
 */
export function ThemeToggle() {
  const [motyw, setMotyw] = useState<Motyw | null>(null);

  useEffect(() => {
    setMotyw(odczytajMotyw());
  }, []);

  function wybierz(nowy: Motyw) {
    setMotyw(nowy);
    zastosujMotyw(nowy);
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Motyw kolorystyczny">
      {OPCJE.map((o) => (
        <button
          key={o.wartosc}
          type="button"
          role="radio"
          aria-checked={motyw === o.wartosc}
          className="theme-toggle-option"
          onClick={() => wybierz(o.wartosc)}
        >
          {o.etykieta}
        </button>
      ))}
    </div>
  );
}

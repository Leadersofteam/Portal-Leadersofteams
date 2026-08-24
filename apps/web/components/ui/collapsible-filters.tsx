'use client';

import { useState, type ReactNode } from 'react';

/**
 * Zwijane filtry (PD3, uogólnione 24.08). Na 390 px kilka pól formularza
 * spycha pierwszy wynik o cały ekran — a pierwsza mila listy to WYNIKI, nie
 * formularz. Desktop (≥768 px) widzi filtry od razu (CSS `.filters-disclosure`),
 * telefon dostaje przycisk. Formularz w środku to zwykły GET — po submit strona
 * renderuje się od nowa, więc stan rozwinięcia nie musi przeżywać nawigacji.
 *
 * Wcześniej ten wzorzec istniał tylko dla /uslugi (ListingFilters). Wyniesiony
 * tu, bo /zlecenia i /liderzy miały ten sam problem — pierwszy wynik pod zgięciem.
 */
export function CollapsibleFilters({
  children,
  labelOpen = 'Zwiń filtry',
  labelClosed = 'Filtruj i sortuj',
}: {
  children: ReactNode;
  labelOpen?: string;
  labelClosed?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={open ? 'filters-disclosure open' : 'filters-disclosure'}>
      <button
        type="button"
        className="btn secondary filters-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? labelOpen : labelClosed}
      </button>
      <div className="filters-body">{children}</div>
    </div>
  );
}

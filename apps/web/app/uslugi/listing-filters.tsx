'use client';

import { useState, type ReactNode } from 'react';

/**
 * Zwijane filtry katalogu (PD3). Na 390 px cztery pola formularza spychały
 * pierwszą kartę usługi o cały ekran — a pierwsza mila katalogu to KARTY,
 * nie formularz. Desktop (≥768 px) widzi filtry od razu (CSS), telefon
 * dostaje przycisk. Formularz w środku jest zwykłym GET-em — po submit
 * strona i tak renderuje się od nowa, więc stan rozwinięcia nie musi
 * przeżywać nawigacji.
 */
export function ListingFilters({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={open ? 'filters-disclosure open' : 'filters-disclosure'}>
      <button
        type="button"
        className="btn secondary filters-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Zwiń filtry' : 'Filtruj i sortuj'}
      </button>
      <div className="filters-body">{children}</div>
    </div>
  );
}

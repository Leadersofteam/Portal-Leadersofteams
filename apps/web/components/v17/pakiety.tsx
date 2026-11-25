'use client';

// Pakiety usługi (Fiverr): przełącznik Podstawowy / Standard / Premium z jednym aktywnym panelem — port z rynek.js.
// Ceny to deklaracja Lidera; rozliczenie idzie przez zapytanie → zlecenie, więc CTA prowadzi do formularza zapytania.
import { useState } from 'react';

import { Ico } from './ico';
import { zl } from './rynek';

export interface PakietDane {
  tier: string;
  etykieta: string;
  nazwa: string;
  cena: number;
  dni: number;
  zakres: string;
}

export function Pakiety({ pakiety, wlasciciel }: { pakiety: PakietDane[]; wlasciciel: boolean }) {
  const start = Math.max(
    0,
    pakiety.findIndex((p) => p.tier === 'STANDARD'),
  );
  const [aktywny, setAktywny] = useState(start);
  if (pakiety.length === 0) return null;

  function naKlawisz(e: React.KeyboardEvent, i: number) {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + pakiety.length) % pakiety.length;
    setAktywny(n);
    document.getElementById(`pt${n}`)?.focus();
  }

  return (
    <aside className="pak" aria-label="Pakiety usługi">
      <div role="tablist" aria-label="Pakiet">
        {pakiety.map((p, i) => (
          <button
            key={p.tier}
            role="tab"
            type="button"
            id={`pt${i}`}
            aria-controls={`pp${i}`}
            aria-selected={i === aktywny}
            tabIndex={i === aktywny ? 0 : -1}
            onClick={() => setAktywny(i)}
            onKeyDown={(e) => naKlawisz(e, i)}
          >
            {p.etykieta}
          </button>
        ))}
      </div>
      {pakiety.map((p, i) => {
        const punkty = p.zakres
          .split(/\n+/)
          .map((l) => l.replace(/^[-•*]\s*/, '').trim())
          .filter(Boolean);
        return (
          <div
            className="pp"
            role="tabpanel"
            id={`pp${i}`}
            key={p.tier}
            aria-labelledby={`pt${i}`}
            hidden={i !== aktywny}
          >
            <div className="pc">
              <b>{zl(p.cena)}</b>
              <span>{p.nazwa}</span>
            </div>
            <div className="meta-p">
              <div>
                Realizacja<b>do {p.dni} dni</b>
              </div>
            </div>
            <ul>
              {punkty.map((c, k) => (
                <li key={k}>
                  <Ico n="check" />
                  {c}
                </li>
              ))}
            </ul>
            {wlasciciel ? null : (
              <a className="vbtn glowny" href="#zapytaj">
                Zapytaj o pakiet {p.etykieta} · {zl(p.cena)}
              </a>
            )}
            <p className="male">
              Lider potwierdzi zakres i termin, zanim cokolwiek zaczniecie.{' '}
              <a href="/zlecenia/nowe">Potrzebujesz czegoś innego? Zaproponuj własne zlecenie</a>
            </p>
          </div>
        );
      })}
    </aside>
  );
}

// Klocki wątków (oferta, zapytanie) — port `msg` i `nicPkt` z p1b.js. Komponenty serwerowe.
import type { ReactNode } from 'react';

import { Ico } from './ico';
import { Aw } from './znaki';

const strefa = 'Europe/Warsaw';

/** „dziś, 09:12” / „wczoraj, 17:05” / „24.11, 10:02” (rok tylko, gdy inny niż bieżący). */
export function kiedyWiadomosc(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const dzien = (x: Date) => x.toLocaleDateString('sv-SE', { timeZone: strefa });
  const godz = d.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: strefa,
  });
  if (dzien(d) === dzien(now)) return `dziś, ${godz}`;
  if (dzien(d) === dzien(new Date(now.getTime() - 86_400_000))) return `wczoraj, ${godz}`;
  const tenRok = dzien(d).slice(0, 4) === dzien(now).slice(0, 4);
  const data = d.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: tenRok ? undefined : 'numeric',
    timeZone: strefa,
  });
  return `${data}, ${godz}`;
}

export function Wiadomosc({
  autor,
  firma = false,
  kiedy,
  ja,
  dodatek,
  children,
}: {
  autor: string;
  firma?: boolean;
  kiedy: string;
  ja: boolean;
  dodatek?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={ja ? 'msg ja' : 'msg'}>
      <Aw name={autor} size={40} company={firma} />
      <div>
        <div className="g">
          <b>{autor}</b>
          {ja ? <span>(Ty)</span> : null}
          <span>· {kiedy}</span>
        </div>
        {dodatek}
        <p>{children}</p>
      </div>
    </li>
  );
}

export function RozmowaBezPunktow() {
  return (
    <p className="rn-nic">
      <Ico n="seal-check" />
      <span>
        Rozmowa punktów nie daje. <b>Punkty daje dopiero ocena po zrealizowanym zleceniu.</b>
      </span>
    </p>
  );
}

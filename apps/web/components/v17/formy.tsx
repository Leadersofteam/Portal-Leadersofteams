// Klocki ekranów „Rynek — reszta” (port z p1b.js, makieta zaakceptowana 27.11). Bez hooków:
// działają i w komponentach serwerowych, i w klienckich formularzach.
import type { ReactNode } from 'react';

import { Ico } from './ico';
import type { IcoName } from './ico';

/** Pole formularza: etykieta z licznikiem po prawej, błąd pod polem, zdanie pomocnicze.
 *  Przy `blad` kontrolka powinna dostać `aria-invalid` i `aria-describedby={`${id}-e`}`. */
export function Pole({
  id,
  etykieta,
  licznik,
  blad,
  pomoc,
  children,
}: {
  id: string;
  etykieta: ReactNode;
  licznik?: ReactNode;
  blad?: string | null;
  pomoc?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={blad ? 'pf zle' : 'pf'}>
      <label htmlFor={id}>
        {etykieta}
        {licznik ? <small>{licznik}</small> : null}
      </label>
      {children}
      {blad ? (
        <span className="err" id={`${id}-e`}>
          <Ico n="warning-circle" />
          {blad}
        </span>
      ) : null}
      {pomoc ? <span className="pom">{pomoc}</span> : null}
    </div>
  );
}

export function Info({
  ikona,
  rodzaj,
  akcje,
  children,
}: {
  ikona: IcoName;
  rodzaj?: 'ok' | 'zle';
  akcje?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={rodzaj ? `info ${rodzaj}` : 'info'}
      role={rodzaj === 'zle' ? 'alert' : 'status'}
    >
      <Ico n={ikona} />
      <div>{children}</div>
      {akcje ? <div className="ak">{akcje}</div> : null}
    </div>
  );
}

// Regulamin i prywatność w V17 P6: zakładki między dokumentami i spis treści z nagłówków §.
import Link from 'next/link';
import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { RamaPubliczna } from './rama';

const DOKUMENTY = [
  ['/regulamin', 'Regulamin'],
  ['/prywatnosc', 'Polityka prywatności'],
] as const;

type Wezel = ReactElement<{ children?: ReactNode; id?: string }>;

function tekst(n: ReactNode): string {
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(tekst).join('');
  return isValidElement(n) ? tekst((n as Wezel).props.children) : '';
}

export function Dokument({
  aktywny,
  tresc,
}: {
  aktywny: '/regulamin' | '/prywatnosc';
  /** Wynik komponentu z components/legal — fragment z płaską listą węzłów. */
  tresc: ReactElement<{ children?: ReactNode }>;
}) {
  const spis: string[] = [];
  const wezly = Children.map(tresc.props.children, (w) => {
    if (!isValidElement(w) || w.type !== 'h2') return w;
    spis.push(tekst((w as Wezel).props.children));
    return cloneElement(w as Wezel, { id: `p${spis.length}` });
  });

  return (
    <RamaPubliczna>
      <nav className="dok-zakl" aria-label="Dokumenty">
        {DOKUMENTY.map(([href, t]) => (
          <Link key={href} href={href} aria-current={href === aktywny ? 'page' : undefined}>
            {t}
          </Link>
        ))}
      </nav>
      <div className="dok">
        <nav className="dok-spis" data-przesuw aria-label="Spis treści">
          {spis.map((t, i) => (
            <a key={t} href={`#p${i + 1}`}>
              {t}
            </a>
          ))}
        </nav>
        <article className="dok-tekst">{wezly}</article>
      </div>
    </RamaPubliczna>
  );
}

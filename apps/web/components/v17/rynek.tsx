// Drobne klocki wspólne dla ekranów P1 „Rynek” (zlecenia, usługi). Port z rynek.js (makieta zaakceptowana 25.11).
import Link from 'next/link';
import type { ReactNode } from 'react';

import { nf, plural } from '@/lib/v17';

import { Ico } from './ico';

export const zl = (n: number) => nf(n) + String.fromCharCode(160) + 'zł';

export function Ocena({
  srednia,
  liczba,
  klasa = 'oc',
}: {
  srednia: number | null;
  liczba: number;
  klasa?: string;
}) {
  if (!liczba || srednia === null) return <span className={`${klasa} bez`}>Bez ocen</span>;
  return (
    <span className={klasa}>
      <Ico n="star" />
      {String(srednia).replace('.', ',')} <small>({liczba})</small>
    </span>
  );
}

export function Naglowek({
  tytul,
  meta,
  cta,
}: {
  tytul: string;
  meta: string;
  cta: { href: string; etykieta: string };
}) {
  return (
    <div className="rn-gl">
      <div>
        <h1>{tytul}</h1>
        <div className="meta-l">{meta}</div>
      </div>
      <Link className="vbtn glowny" href={cta.href}>
        <Ico n="plus" />
        {cta.etykieta}
      </Link>
    </div>
  );
}

export function Wstecz({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="rn-wstecz" href={href}>
      <Ico n="arrow-left" />
      {children}
    </Link>
  );
}

export const ofertyEtykieta = (n: number) => plural(n, 'oferta', 'oferty', 'ofert');

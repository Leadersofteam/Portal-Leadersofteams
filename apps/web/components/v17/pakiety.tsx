'use client';

// Pakiety usługi (Fiverr): przełącznik Podstawowy / Standard / Premium z jednym aktywnym panelem — port z rynek.js.
// W Portalu NIE MA zamówienia pakietu (cena to deklaracja Lidera; rozliczenie idzie zapytanie → zlecenie), więc CTA
// jest „Zapytaj o pakiet”, a nie „Zleć pakiet” z makiety. Formularz zapytania rozwija się dopiero po kliknięciu CTA —
// nie stoi jako osobna sekcja. Gość po kliknięciu trafia do logowania i wraca na tę usługę (?next=).
import Link from 'next/link';
import { useState } from 'react';

import { InquiryForm } from '@/app/uslugi/[slug]/inquiry-form';

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

export type ZapytanieDane =
  | { tryb: 'formularz'; listingId: string; firmy: Array<{ id: string; name: string }> }
  | { tryb: 'gosc'; next: string }
  | { tryb: 'bez-firmy' };

export function Pakiety({
  pakiety,
  zapytanie,
}: {
  pakiety: PakietDane[];
  /** null = właściciel usługi (nie pyta sam siebie). */
  zapytanie: ZapytanieDane | null;
}) {
  const start = Math.max(
    0,
    pakiety.findIndex((p) => p.tier === 'STANDARD'),
  );
  const [aktywny, setAktywny] = useState(start);
  const [otwarte, setOtwarte] = useState(false);
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
        const etykietaCta = `Zapytaj o pakiet ${p.etykieta} · ${zl(p.cena)}`;
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
            {zapytanie?.tryb === 'gosc' ? (
              <Link
                className="vbtn glowny"
                href={`/logowanie?next=${encodeURIComponent(zapytanie.next)}`}
              >
                {etykietaCta}
              </Link>
            ) : zapytanie ? (
              <button
                className="vbtn glowny"
                type="button"
                aria-expanded={otwarte}
                aria-controls="zapytaj"
                onClick={() => setOtwarte((o) => !o)}
              >
                {etykietaCta}
              </button>
            ) : null}
            <p className="male">
              Lider potwierdzi zakres i termin, zanim cokolwiek zaczniecie.{' '}
              <Link href="/zlecenia/nowe">
                Potrzebujesz czegoś innego? Zaproponuj własne zlecenie
              </Link>
            </p>
          </div>
        );
      })}
      {zapytanie && zapytanie.tryb !== 'gosc' && otwarte ? (
        <div className="zap" id="zapytaj">
          {zapytanie.tryb === 'formularz' ? (
            <InquiryForm
              key={pakiety[aktywny]?.tier}
              listingId={zapytanie.listingId}
              companies={zapytanie.firmy}
              packages={pakiety.map((p) => p.tier)}
              defaultTier={pakiety[aktywny]?.tier}
            />
          ) : (
            <p>
              Zapytania wysyłają Firmy — <Link href="/firma/nowa">dodaj profil swojej firmy</Link>,
              żeby napisać do Lidera.
            </p>
          )}
        </div>
      ) : null}
    </aside>
  );
}

'use client';

// Porównanie ofert obok siebie (widok Firmy) — port z rynek.js (zlecenieStan/wierszOferty). Wybór wykonawcy to ta sama
// akcja co na starym wyglądzie (POST /offers/:id/accept), tylko po zaznaczeniu oferty kółkiem zamiast przycisku w każdej karcie.
import Link from 'next/link';
import { useState } from 'react';

import { useAction } from '@/components/action-button';
import { apiFetch } from '@/lib/api';

import { Ico } from './ico';
import { nf4, ocenaSrednia } from '@/lib/v17';

import { zl } from './rynek';
import { Aw, Odznaka } from './znaki';

export interface OfertaWiersz {
  id: string;
  status: string;
  statusEtykieta: string;
  profileId: string;
  nazwa: string;
  branza: string;
  kiedy: string;
  wiadomosc: string;
  cena: number | null;
  dni: number | null;
  poziom: number;
  punkty: number | null;
  srednia: number | null;
  liczbaOcen: number;
  wiadomosci: string;
}

const dniW = (n: number) => `${n} ${n === 1 ? 'dzień' : 'dni'}`;

export function OfertyPorownanie({
  oferty,
  mozeWybierac,
}: {
  oferty: OfertaWiersz[];
  mozeWybierac: boolean;
}) {
  // Bez domyślnego wyboru: zaznaczona z góry oferta zachęcałaby do zatwierdzenia „jednym kliknięciem” (recenzja makiety).
  const [wybrana, setWybrana] = useState<string | null>(null);
  const { run, error, pending } = useAction();
  const minCena = Math.min(...oferty.map((o) => o.cena ?? Infinity));
  const minDni = Math.min(...oferty.map((o) => o.dni ?? Infinity));
  const sel = oferty.find((o) => o.id === wybrana) ?? null;

  return (
    <>
      <table className="of">
        <thead>
          <tr>
            <th style={{ width: 44 }}>
              <span className="sr">Wybór</span>
            </th>
            <th>Oferent</th>
            <th>Poziom w Drabince</th>
            <th>Cena</th>
            <th>Termin</th>
            <th>Oceny po zleceniach</th>
          </tr>
        </thead>
        <tbody>
          {oferty.map((o) => {
            const wybieralna = mozeWybierac && o.status === 'SUBMITTED';
            const zaznaczona = wybrana === o.id;
            const poziom = (
              <span className="m-poz of-poz">
                <Odznaka level={o.poziom} kreski />
              </span>
            );
            return (
              <tr
                key={o.id}
                className={`of-w${zaznaczona ? ' wyb' : ''}`}
                onClick={wybieralna ? () => setWybrana(o.id) : undefined}
              >
                <td className="sel">
                  {wybieralna ? (
                    <label className="of-wyb">
                      <input
                        type="radio"
                        name="oferta"
                        checked={zaznaczona}
                        onChange={() => setWybrana(o.id)}
                        aria-label={`Wybierz ofertę: ${o.nazwa}`}
                      />
                    </label>
                  ) : null}
                </td>
                <td className="kto">
                  <div className="of-kto">
                    <Aw name={o.nazwa} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <b>
                        <Link href={`/liderzy/${o.profileId}`} onClick={(e) => e.stopPropagation()}>
                          {o.nazwa}
                        </Link>
                      </b>
                      <small>
                        {o.branza} · złożona {o.kiedy}
                      </small>
                      {/* Status oferty (Zaakceptowana/Odrzucona) stoi przy oferencie, nie w kolumnie ocen. */}
                      {o.status !== 'SUBMITTED' ? (
                        <span className="cap">{o.statusEtykieta}</span>
                      ) : null}
                      {poziom}
                      <p className="not" style={{ margin: '6px 0 0' }}>
                        {o.wiadomosc}
                      </p>
                      <Link
                        className="of-watek"
                        href={`/oferty/${o.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {o.wiadomosci} →
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="poz of-poz">
                  <Odznaka level={o.poziom} kreski />
                  <span className="pk">{nf4(o.punkty ?? 0)} pkt</span>
                </td>
                <td data-e="Cena" className="of-c">
                  {o.cena ? zl(o.cena) : '—'}
                  {o.cena && o.cena === minCena && oferty.length > 1 ? (
                    <span className="plus">najniższa</span>
                  ) : null}
                </td>
                <td data-e="Termin" className="of-t">
                  {o.dni ? dniW(o.dni) : '—'}
                  {o.dni && o.dni === minDni && oferty.length > 1 ? (
                    <span className="plus">najkrótszy</span>
                  ) : null}
                </td>
                <td data-e="Oceny po zleceniach">
                  <div className={o.liczbaOcen && o.srednia !== null ? 'of-ok' : 'of-ok bez'}>
                    {o.liczbaOcen && o.srednia !== null ? (
                      <>
                        <Ico n="star" />
                        {ocenaSrednia(o.srednia)} <small>({o.liczbaOcen})</small>
                      </>
                    ) : (
                      'Bez ocen'
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {mozeWybierac ? (
        <div className="of-pod">
          <div className="wyb" id="of-wyb">
            {sel ? (
              <>
                <Aw name={sel.nazwa} size={36} />
                <span>
                  Wybrana oferta: <b>{sel.nazwa}</b>
                  <br />
                  <span className="n">{sel.cena ? zl(sel.cena) : 'cena do ustalenia'}</span>
                  {sel.dni ? ` · ${dniW(sel.dni)}` : ''}
                </span>
              </>
            ) : (
              <span>Zaznacz jedną ofertę, żeby ją wybrać</span>
            )}
          </div>
          <button
            className="vbtn glowny"
            type="button"
            disabled={!sel || pending}
            onClick={() =>
              sel && void run(() => apiFetch(`/offers/${sel.id}/accept`, { method: 'POST' }))
            }
          >
            {pending ? '…' : 'Wybierz wykonawcę'}
          </button>
          {error ? (
            <span className="error-box" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// Karty prawej kolumny strumienia i wspólne stany (pusty / ładowanie / błąd) ekranów V17.
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { LevelRule } from '@/lib/levels';
import { budget, nf, plural, progress } from '@/lib/v17';
import type { MojaDrabinka } from '@/lib/v17-data';

import { Ico } from './ico';
import type { IcoName } from './ico';
import { Aw, Miernik, Odznaka } from './znaki';

/** Karta „Twoja Drabinka” — liczby z /me/ladder, próg z lib/levels (lustro rules.ts). */
export function KartaDrabinki({
  moja,
  name,
  avatarFileId,
  rules,
}: {
  moja: MojaDrabinka;
  name: string;
  avatarFileId: string | null;
  rules: LevelRule[];
}) {
  const c = `var(--level-${Math.max(moja.level, 1)})`;
  const next = moja.next;
  const prog = next ? next.pointsRequired : (rules[6]?.pointsRequired ?? 12000);
  // Kreska = minimalny udział ścieżki z reguły szczebla (od L4 min. 20% progu), nie liczba z makiety.
  const kreska =
    next && next.minPathSharePct
      ? Math.round((next.pointsRequired * next.minPathSharePct) / 100)
      : null;
  const brakSpol = kreska !== null ? Math.max(0, kreska - moja.spol) : 0;
  return (
    <section className="karta hero-dr" aria-labelledby="kd">
      <header>
        <h2 id="kd">Twoja Drabinka</h2>
        <Link href="/drabinka">
          Pełna Drabinka <Ico n="arrow-right" />
        </Link>
      </header>
      <div className="hd">
        <Aw
          name={name}
          size={88}
          ring
          level={moja.level}
          progress={progress(moja.level, moja.razem, rules)}
          src={avatarFileId ? `/api/v1/files/${avatarFileId}/thumb` : null}
        />
        <div className="liczby">
          <div className="duza-liczba">
            <b>{nf(moja.razem)}</b>
            <span>pkt</span>
          </div>
          <Odznaka level={moja.level} big />
          {next ? (
            <small>
              {nf(next.missingPoints)} do „{next.name}”
            </small>
          ) : (
            <small>Najwyższy szczebel</small>
          )}
        </div>
      </div>
      <div className="dwie-sc">
        <div className="sc">
          <div className="wiersz">
            <span>
              <Ico n="clipboard-text" />
              Rynek
            </span>
            <b>
              {nf(moja.rynek)}{' '}
              {moja.czekaRynek ? <span className="dojrzewa">+{nf(moja.czekaRynek)}</span> : null}
            </b>
          </div>
          <Miernik
            value={moja.rynek}
            max={prog}
            color={c}
            waiting={moja.czekaRynek}
            mark={kreska}
          />
        </div>
        <div className="sc">
          <div className="wiersz">
            <span>
              <Ico n="chats-circle" />
              Społeczność
            </span>
            <b>
              {nf(moja.spol)}{' '}
              {moja.czekaSpol ? <span className="dojrzewa">+{nf(moja.czekaSpol)}</span> : null}
            </b>
          </div>
          <Miernik value={moja.spol} max={prog} color={c} waiting={moja.czekaSpol} mark={kreska} />
        </div>
        {kreska !== null && next ? (
          <div className="pod">
            Kreska: {nf(kreska)} pkt, czyli {next.minPathSharePct}% progu „{next.name}” — wymóg dla
            każdej ścieżki
          </div>
        ) : null}
      </div>
      {brakSpol > 0 ? (
        <div className="krok">
          <Ico n="footprints" />
          <span>
            <b>Najkrótsza droga:</b> {Math.ceil(brakSpol / 50)}{' '}
            {plural(
              Math.ceil(brakSpol / 50),
              'uznana odpowiedź',
              'uznane odpowiedzi',
              'uznanych odpowiedzi',
            )}{' '}
            domknie próg społeczności (brakuje {nf(brakSpol)} pkt).
          </span>
        </div>
      ) : null}
    </section>
  );
}

/** Zaproszenie dla gościa zamiast karty Drabinki — bez liczb, których nie ma. */
export function KartaGoscia() {
  return (
    <section className="karta hero-dr" aria-labelledby="kd">
      <header>
        <h2 id="kd">Drabinka Lidera</h2>
        <Link href="/drabinka">
          Zasady <Ico n="arrow-right" />
        </Link>
      </header>
      <div className="krok">
        <Ico n="ladder" />
        <span>
          Siedem szczebli. Punkt przyznaje wyłącznie drugi człowiek: firma, która oceniła zlecenie,
          albo Lider, który uznał odpowiedź. <Link href="/rejestracja">Załóż konto</Link>.
        </span>
      </div>
    </section>
  );
}

export function KartaZlecen({
  zlecenia,
}: {
  zlecenia: Array<{
    id: string;
    title: string;
    company: string;
    industry: string;
    min: number;
    max: number;
    offers: number;
  }>;
}) {
  if (zlecenia.length === 0) return null;
  return (
    <section className="karta" aria-labelledby="kz">
      <header>
        <h2 id="kz">Zlecenia w twojej branży</h2>
        <Link href="/zlecenia">Wszystkie</Link>
      </header>
      <ul className="lista">
        {zlecenia.map((z) => (
          <li key={z.id}>
            <Link href={`/zlecenia/${z.id}`} className="mz">
              <Aw name={z.company} size={40} company industry={z.industry} />
              <span className="t">
                <b>{z.title}</b>
                <small>
                  {budget(z.min, z.max)} ·{' '}
                  {z.offers
                    ? `${z.offers} ${plural(z.offers, 'oferta', 'oferty', 'ofert')}`
                    : 'bez ofert'}
                </small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Tematy jako NAWIGACJA (ADR-010) — kolejność z API nie przesądza o kolejności treści. */
export function KartaTematow({ tematy }: { tematy: Array<{ name: string; slug: string }> }) {
  if (tematy.length === 0) return null;
  return (
    <section className="tematy" aria-labelledby="kt">
      <h2 id="kt">Tematy</h2>
      <div className="chipy">
        {tematy.map((t) => (
          <Link key={t.slug} className="chip" href={`/tematy/${t.slug}`}>
            # {t.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Stany ──
export function Komunikat({
  ikona,
  tytul,
  opis,
  children,
}: {
  ikona: IcoName;
  tytul: string;
  opis: string;
  children?: ReactNode;
}) {
  return (
    <div className="komunikat">
      <span className="komunikat-ik">
        <Ico n={ikona} />
      </span>
      <h2>{tytul}</h2>
      <p>{opis}</p>
      {children ? <div className="komunikat-akcje">{children}</div> : null}
    </div>
  );
}

const Sz = ({
  w,
  h = 12,
  kolo = false,
  m = false,
}: {
  w: string;
  h?: number;
  kolo?: boolean;
  m?: boolean;
}) => (
  <span className={`sz${kolo ? ' kolo' : ''}${m ? ' m' : ''}`} style={{ width: w, height: h }} />
);

export function SzkieletStrumienia() {
  return (
    <div role="status" aria-busy="true" aria-label="Wczytywanie strumienia">
      {[0, 1, 2, 3].map((i) => (
        <div className="wpis" key={i} aria-hidden="true">
          <span className="aw" style={{ width: 48, height: 48, background: 'var(--surface-3)' }} />
          <div style={{ display: 'grid', gap: 10, paddingTop: 4 }}>
            <span
              style={{ height: 12, width: '40%', borderRadius: 6, background: 'var(--surface-3)' }}
            />
            <span
              style={{ height: 12, width: '92%', borderRadius: 6, background: 'var(--surface-2)' }}
            />
            <span
              style={{
                height: 96,
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export const SzWiersz = () => (
  <div className="sz-wiersz">
    <Sz w="40px" h={40} kolo />
    <div>
      <Sz w="46%" />
      <Sz w="88%" h={10} m />
    </div>
    <Sz w="44px" h={20} />
  </div>
);
export { Sz };

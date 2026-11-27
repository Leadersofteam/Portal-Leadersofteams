// Strona główna V17 P6. Prerenderowana jak app/page.tsx (publicApi + ISR, zero cookies — mina PD1).
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import { LadderScene } from '@/components/ui/ladder-scene';
import type { LeaderRowData } from '@/components/ui/leader-row';
import { PierwszyPunkt } from '@/components/v17p6/czesci';
import { RamaPubliczna } from '@/components/v17p6/rama';
import { Ico } from '@/components/v17/ico';
import { Aw, Odznaka } from '@/components/v17/znaki';
import { FIRM_STEPS } from '@/lib/firm-steps';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';
import { LEVEL_RULES_FALLBACK } from '@/lib/levels';
import { publicApi } from '@/lib/server-api';
import { nf } from '@/lib/v17';

type Css = CSSProperties & Record<`--${string}`, string | number>;

// Treść 1:1 z dzisiejszym app/page.tsx.
const FAQ: Array<[string, ReactNode]> = [
  [
    'Czym to się różni od Fiverr czy Oferteo?',
    <>
      Tam kupujesz widoczność albo licytujesz ceną. Tu pozycję Lidera buduje wyłącznie oceniona
      praca i uznany mentoring — poziom w Drabince jest zweryfikowanym dowodem kompetencji, którego
      nie można kupić.
    </>,
  ],
  [
    'Czy to jakiś system MLM?',
    <>
      Nie — i to jest wbudowane w architekturę, nie tylko w regulamin. Zero punktów za zapraszanie,
      rekrutację, publikowanie treści czy samo logowanie. Rejestr punktów jest jawny: zawsze widać,
      za co i ile.
    </>,
  ],
  [
    'Ile kosztuje udział w platformie?',
    <>
      Rejestracja i korzystanie z marketplace, grup i Q&A są bezpłatne. Platforma nie pośredniczy w
      płatnościach — rozliczasz się bezpośrednio z drugą stroną.
    </>,
  ],
  [
    'Jak Firma może zlecić pracę?',
    <>
      Opisz potrzebę bez konta — konto i firmę założysz jednym krokiem po formularzu. Publikujesz po
      potwierdzeniu adresu e-mail. Oferty składają Liderzy o wymaganym poziomie, przy każdej masz
      rozmowę, a po realizacji oceniacie się nawzajem.{' '}
      <Link href="/dla-firm">Więcej dla firm →</Link>
    </>,
  ],
  [
    'Co daje wyższy poziom w Drabince?',
    <>
      Dostęp do większych zleceń, prawo zakładania grup branżowych (od poziomu 2), od poziomu 5 —
      dostęp do aplikacji LOT (CRM dla zespołów), a na poziomie 7 — własny zespół prowadzony w tej
      aplikacji. Poziom raz zdobyty nie wygasa.
    </>,
  ],
];

function ocen(n: number) {
  const d = n % 10;
  const s = n % 100;
  if (n === 1) return 'ocena';
  return d >= 2 && d <= 4 && (s < 12 || s > 14) ? 'oceny' : 'ocen';
}

export default async function LandingV17() {
  const dane = await publicApi<{ leaders: LeaderRowData[] }>('/leaders?limit=3').catch(() => null);
  const liderzy = (dane?.leaders ?? []).filter((l) => l.level >= 1).slice(0, 3);

  return (
    <RamaPubliczna landing>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      <section className="p-hero">
        <div>
          <p className="nadtytul">Marketplace B2B · Liderzy zespołów</p>
          <h1>
            Opisz zlecenie. Oferty złożą <span className="szczebel">sprawdzeni</span> Liderzy.
          </h1>
          <p className="lid">
            Sprzedaż, operacje, projekty, automatyzacja — Liderzy odpowiadają ofertą z kwotą i
            terminem. Przy każdej widzisz poziom w Drabince, oceny innych firm i zrealizowane
            zlecenia. Bez prowizji, bez konta na start.
          </p>
          <div className="cta">
            <Link className="vbtn glowny duzy" href="/zlecenia/nowe">
              Dodaj zlecenie
            </Link>
            <Link className="vbtn obrys duzy" href="/rejestracja">
              Szukam zleceń — dołącz jako Lider
            </Link>
          </div>
          <dl className="p-liczby" aria-label="Zasady platformy w liczbach">
            <div>
              <dt>0 zł</dt>
              <dd>prowizji i opłat za zlecenie</dd>
            </div>
            <div>
              <dt>2</dt>
              <dd>kroki: opis potrzeby, potem konto</dd>
            </div>
            <div>
              <dt>0</dt>
              <dd>punktów do kupienia — poziom to oceniona praca</dd>
            </div>
          </dl>
        </div>
        <div className="p-scena">
          <LadderScene />
          {/* Statyczny, podpisany przykład reguły — nie dane z Portalu (ADR-010). Nazwy fikcyjne. */}
          <div className="promien-przyklad">
            <small>Przykład: światło daje drugi człowiek</small>
            <span className="p-kto">
              <Aw name="Hotel Zatoka" size={36} company industry="Hotelarstwo" />
            </span>
            <span className="linia" aria-hidden="true" />
            <span className="p-kto">
              <Aw name="Marta Jodła" size={36} />
              <b className="p-pkt">+100 pkt</b>
            </span>
            <small>ocena 5/5 po zleceniu</small>
          </div>
        </div>
      </section>

      <section className="sek">
        <p className="nadtytul">Jak zlecić pracę</p>
        <h2>Od opisu do ocenionej pracy</h2>
        <ol className="schody">
          {FIRM_STEPS.map((k) => (
            <li key={k.title}>
              <h3>{k.title}</h3>
              <p>{k.body}</p>
            </li>
          ))}
        </ol>
        <Link className="vbtn obrys" href="/zlecenia/nowe">
          Dodaj zlecenie
        </Link>
      </section>

      {liderzy.length > 0 && (
        <section className="sek">
          <p className="nadtytul">Kogo spotkasz</p>
          <h2>Poziom to dowód, nie deklaracja</h2>
          <div className="p-lista">
            {liderzy.map((l) => (
              <div className="lid-w" key={l.id}>
                <Aw
                  name={l.displayName}
                  size={52}
                  ring
                  level={l.level}
                  src={l.avatarFileId ? `/api/v1/files/${l.avatarFileId}/thumb` : null}
                />
                <div>
                  <h3>
                    <Link href={`/liderzy/${l.id}`}>{l.displayName}</Link>
                  </h3>
                  <p>{l.headline}</p>
                  <small>{l.industry.name}</small>
                </div>
                <div className="prawo">
                  <Odznaka level={l.level} />
                  {l.reviewCount > 0 && (
                    <span className="ocena-l">
                      <Ico n="star" />
                      <b>{String(l.averageRating).replace('.', ',')}/5</b>({l.reviewCount}{' '}
                      {ocen(l.reviewCount)})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '16px 0 0' }}>
            <Link className="p-link" href="/liderzy">
              Przeglądaj cały katalog Liderów →
            </Link>
          </p>
        </section>
      )}

      <section className="sek lider-sek">
        <div>
          <p className="nadtytul">Dla Liderów</p>
          <h2 className="h">Szukasz zleceń? Pozycję budujesz pracą, nie znajomościami.</h2>
          <p className="lid">
            Punkty w Drabince dają wyłącznie oceny Firm po zrealizowanym zleceniu i odpowiedzi
            uznane w Q&amp;A. Wyższy poziom to większe zlecenia, prawo zakładania grup, a od poziomu
            5 — dostęp do aplikacji LOT, w której prowadzisz własny zespół.
          </p>
          <ol className="szczeble" aria-label="Siedem szczebli Drabinki">
            {LEVEL_RULES_FALLBACK.map((s, i) => (
              <li key={s.level} style={{ '--c': `var(--level-${s.level})`, '--i': i } as Css}>
                <b>{s.level}</b>
                <span>{s.name}</span>
                <small>{nf(s.pointsRequired)} pkt</small>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <PierwszyPunkt />
          <div className="cta">
            <Link className="vbtn obrys" href="/rejestracja">
              Dołącz jako Lider
            </Link>
          </div>
          <p style={{ margin: '12px 0 0', display: 'flex', flexWrap: 'wrap', gap: '0 20px' }}>
            <Link className="p-link" href="/droga">
              Droga Lidera, szczebel po szczeblu →
            </Link>
            <Link className="p-link" href="/drabinka">
              Jawne zasady punktacji →
            </Link>
          </p>
        </div>
      </section>

      <section className="sek">
        <p className="nadtytul">FAQ</p>
        <h2>Najczęstsze pytania</h2>
        <div className="p-faq">
          {FAQ.map(([pytanie, odpowiedz], i) => (
            <details key={pytanie} open={i === 0}>
              <summary>
                {pytanie}
                <span className="p-plus" aria-hidden="true" />
              </summary>
              <p>{odpowiedz}</p>
            </details>
          ))}
        </div>
      </section>
      <span className="znak-wodny" aria-hidden="true">
        LEADERS OF TEAMS
      </span>
    </RamaPubliczna>
  );
}

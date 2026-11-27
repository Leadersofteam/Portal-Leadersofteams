import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import type { LeaderRowData } from '@/components/ui/leader-row';
import type { ListingCardData } from '@/components/ui/listing-card';
import { Ico } from '@/components/v17/ico';
import type { IcoName } from '@/components/v17/ico';
import { Stopka } from '@/components/v17/rama';
import { UslugiDlaFirm } from '@/components/v17/reszta-publiczne-listy';
import { RamaPubliczna } from '@/components/v17/reszta-publiczne-rama';
import { Aw, Odznaka } from '@/components/v17/znaki';
import { FIRM_STEPS } from '@/lib/firm-steps';
import { hubBreadcrumbs } from '@/lib/hub';
import { POROWNANIA } from '@/lib/porownania';
import { publicApi } from '@/lib/server-api';
import { ocenaSrednia, plural } from '@/lib/v17';

// Te same metadane co na dzisiejszej stronie.
export { metadata } from '@/app/dla-firm/page';

export const revalidate = 300;

// Krok 2 bez „liczby zrealizowanych zleceń”: tabela ofert jej nie pokazuje (makieta 27.11).
const KROKI = FIRM_STEPS.map((s, i) =>
  i === 1
    ? {
        title: s.title,
        body: 'Liderzy odpowiadają ofertą z kwotą i terminem. Przy każdej widzisz poziom w Drabince, punkty i oceny po zleceniach — żadnego z tych sygnałów nie da się kupić.',
      }
    : s,
);

const DROGI: Array<{ ikona: IcoName; tytul: string; opis: string; cta: string; href: string }> = [
  {
    ikona: 'clipboard-text',
    tytul: 'Opisz potrzebę',
    opis: 'Nie wiesz jeszcze kto — wiesz co. Publikujesz zlecenie z widełkami, Liderzy odpowiadają ofertą, Ty dopytujesz i wybierasz.',
    cta: 'Dodaj zlecenie',
    href: '/zlecenia/nowe',
  },
  {
    ikona: 'storefront',
    tytul: 'Wybierz gotową usługę',
    opis: 'Konkretny zakres, deklarowana cena, pakiety. Wysyłasz zapytanie do Lidera i rozmawiacie w wątku — z niego powstaje zlecenie z pełnym cyklem ocen.',
    cta: 'Przeglądaj usługi',
    href: '/uslugi',
  },
  {
    ikona: 'user-focus',
    tytul: 'Zapytaj konkretnego Lidera',
    opis: 'Katalog z poziomem w Drabince, ocenami i liczbą zrealizowanych zleceń. Na profilu Lidera jest przycisk „Zapytaj o usługę” albo „Zaproponuj zlecenie”.',
    cta: 'Katalog Liderów',
    href: '/liderzy',
  },
];

const FAQ = [
  {
    q: 'Ile to kosztuje?',
    a: 'Nic. Portal nie pośredniczy w płatnościach i nie bierze prowizji — rozliczasz się bezpośrednio z Liderem.',
  },
  {
    q: 'Czy firma musi być zweryfikowana?',
    a: 'Nie. Publikujesz od razu po potwierdzeniu adresu e-mail. NIP jest opcjonalny; wiarygodność firmy budują oceny Liderów po zrealizowanych zleceniach.',
  },
  {
    q: 'Skąd wiem, że Lider jest dobry?',
    a: 'Z jego poziomu w Drabince. Punkty pochodzą wyłącznie z ocen po zrealizowanych zleceniach i z uznanego mentoringu — zero punktów za zapraszanie, płacenie czy aktywność. Każdy punkt ma jawne źródło.',
  },
  {
    q: 'Mogę ograniczyć oferty do doświadczonych Liderów?',
    a: 'Tak — ustawiasz minimalny poziom przy zleceniu. Zlecenia bez wymagań są dobrym startem dla nowych Liderów, którzy budują pierwsze oceny.',
  },
];

export default async function DlaFirmV17() {
  const [leadersData, listingsData] = await Promise.all([
    publicApi<{ leaders: LeaderRowData[] }>('/leaders?limit=6'),
    publicApi<{ listings: ListingCardData[] }>('/listings?limit=3'),
  ]);
  const liderzy = (leadersData?.leaders ?? []).filter((l) => l.level >= 1).slice(0, 3);
  const uslugi = (listingsData?.listings ?? []).slice(0, 3);

  return (
    <RamaPubliczna aktywny="zlecenia">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <JsonLd data={hubBreadcrumbs([{ name: 'Dla firm', path: '/dla-firm' }])} />
      <div className="st">
        <section className="dl-hero" style={{ marginTop: 18 }}>
          <div>
            <h1 className="st-h1" style={{ marginTop: 0, fontSize: 'clamp(28px,4vw,46px)' }}>
              Opisz, co ma powstać. Wybierz, komu ufasz.
            </h1>
            <p className="st-lid">
              Zlecenie opisujesz bez konta i bez prowizji. Oferty składają Liderzy, których poziom i
              oceny są jawne i zapracowane — a przy każdej ofercie masz rozmowę, żeby dopytać, zanim
              wybierzesz.
            </p>
            <div className="ak">
              <Link className="vbtn glowny duzy" href="/zlecenia/nowe">
                <Ico n="plus" />
                Dodaj zlecenie
              </Link>
              <Link className="vbtn obrys duzy" href="/uslugi">
                Przeglądaj gotowe usługi
              </Link>
            </div>
          </div>
        </section>
        <section className="st-sek" aria-labelledby="jak">
          <h2 id="jak">Od opisu do ocenionej pracy</h2>
          <ol className="krok-l">
            {KROKI.map((k) => (
              <li key={k.title}>
                <div>
                  <h3>{k.title}</h3>
                  <p>{k.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="st-sek" aria-labelledby="drogi">
          <h2 id="drogi">Trzy drogi do Lidera</h2>
          <div className="dl-drogi">
            {DROGI.map((d) => (
              <Link
                key={d.href}
                className="zl-w"
                href={d.href}
                style={{ gridTemplateColumns: '40px minmax(0,1fr) auto', alignItems: 'center' }}
              >
                <span
                  style={{
                    fontSize: 24,
                    color: 'var(--text-muted)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Ico n={d.ikona} />
                </span>
                <div>
                  <div className="zl-tyt" style={{ margin: '0 0 4px' }}>
                    {d.tytul}
                  </div>
                  <div className="zl-fakty">
                    <span>{d.opis}</span>
                  </div>
                </div>
                <span
                  className="droga-cta"
                  style={{
                    gridColumn: 'auto',
                    fontSize: 14,
                    fontWeight: 650,
                    color: 'var(--text-strong)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {d.cta}
                  <Ico n="arrow-right" />
                </span>
              </Link>
            ))}
          </div>
        </section>
        {uslugi.length > 0 && (
          <section className="st-sek" aria-labelledby="gu">
            <h2 id="gu">Gotowe usługi: konkretny zakres, jawna cena</h2>
            <UslugiDlaFirm uslugi={uslugi} />
            <Link className="vbtn obrys" href="/uslugi">
              Wszystkie usługi
            </Link>
          </section>
        )}
        {liderzy.length > 0 && (
          <section className="st-sek" aria-labelledby="ks">
            <h2 id="ks">Poziom to dowód, nie deklaracja</h2>
            {liderzy.map((l) => (
              <Link
                key={l.id}
                className="zl-w"
                href={`/liderzy/${l.id}`}
                style={{ gridTemplateColumns: '48px minmax(0,1fr) auto', alignItems: 'center' }}
              >
                <Aw
                  name={l.displayName}
                  size={48}
                  ring
                  level={l.level}
                  src={l.avatarFileId ? `/api/v1/files/${l.avatarFileId}/thumb` : null}
                />
                <div style={{ minWidth: 0 }}>
                  <div className="zl-kto">
                    <b style={{ fontSize: 15 }}>{l.displayName}</b>
                    <Odznaka level={l.level} />
                  </div>
                  <div className="zl-fakty" style={{ marginTop: 4 }}>
                    <span>{l.headline}</span>
                  </div>
                </div>
                {l.reviewCount > 0 && l.averageRating !== null ? (
                  <div className="of-ok">
                    <Ico n="star" />
                    {ocenaSrednia(l.averageRating)}{' '}
                    <small>
                      ({l.reviewCount} {plural(l.reviewCount, 'ocena', 'oceny', 'ocen')})
                    </small>
                  </div>
                ) : (
                  <div className="of-ok bez">Bez ocen</div>
                )}
              </Link>
            ))}
            <Link className="vbtn obrys" style={{ marginTop: 16 }} href="/liderzy">
              Cały katalog Liderów
            </Link>
          </section>
        )}
        <section className="st-sek pyt-l" aria-labelledby="faq">
          <h2 id="faq">Najczęstsze pytania firm</h2>
          {FAQ.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>
                {f.q}
                <Ico n="caret-down" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
        <section className="koniec" aria-labelledby="mk">
          <div>
            <h2 id="mk">Masz konkretną potrzebę?</h2>
            <p>Konto założysz po formularzu, razem z firmą.</p>
          </div>
          <Link className="vbtn glowny duzy" href="/zlecenia/nowe">
            Dodaj zlecenie
          </Link>
        </section>
        <p className="porownaj">
          Porównaj:{' '}
          {POROWNANIA.map((p) => (
            <Link key={p.slug} className="tl" href={`/porownanie/${p.slug}`}>
              {p.name}
            </Link>
          ))}
        </p>
        <div className="rn-stopka rn-st-szer">
          <Stopka />
        </div>
      </div>
    </RamaPubliczna>
  );
}

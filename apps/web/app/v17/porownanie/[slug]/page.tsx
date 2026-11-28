import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import { Ico } from '@/components/v17/ico';
import type { IcoName } from '@/components/v17/ico';
import { Stopka } from '@/components/v17/rama';
import { RamaPubliczna } from '@/components/v17/reszta-publiczne-rama';
import { hubBreadcrumbs } from '@/lib/hub';
import { POROWNANIA, porownanie } from '@/lib/porownania';

export { generateMetadata, generateStaticParams } from '@/app/porownanie/[slug]/page';

// Literał: Next czyta konfigurację segmentu statycznie.
export const revalidate = 3600;
export const dynamicParams = false;

function Kolumna({ tytul, punkty, my }: { tytul: string; punkty: string[]; my: boolean }) {
  const ikona: IcoName = my ? 'check-circle' : 'arrow-bend-up-right';
  return (
    <section
      className="fm-karta"
      style={{ padding: 20, ...(my ? { borderColor: 'var(--text-muted)' } : {}) }}
    >
      {/* h2 (makieta: h3) — poziom nagłówka jak na dzisiejszej stronie, wygląd z makiety. */}
      <h2
        style={{
          margin: '0 0 4px',
          font: '800 19px/1.25 var(--font-display)',
          letterSpacing: 'normal',
          color: 'var(--text-strong)',
        }}
      >
        {tytul}
      </h2>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {punkty.map((x) => (
          <li
            key={x}
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 0',
              borderTop: '1px solid var(--line)',
              fontSize: 14.5,
              lineHeight: 1.55,
              color: 'var(--text-body)',
              marginTop: 0,
            }}
          >
            <Ico n={ikona} />
            {/* Makieta bez wersalików w środku zdania; tekst źródłowy dzielimy ze starym ekranem. */}
            <span>{x.replace('KTO', 'kto').replace('SZUKASZ', 'szukasz')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PorownanieV17({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = porownanie(slug);
  if (!p) notFound();
  const model = p.model.charAt(0).toLowerCase() + p.model.slice(1);

  return (
    <RamaPubliczna aktywny="zlecenia">
      <JsonLd
        data={hubBreadcrumbs([
          { name: `${p.name} a Leaders of Teams`, path: `/porownanie/${slug}` },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: p.faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <div className="st">
        <div style={{ marginTop: 6 }}>
          <ol className="okruchy" aria-label="Ścieżka">
            <li>
              <Link href="/dla-firm">Dla firm</Link>
            </li>
            <li aria-current="page">Porównanie z {p.name}</li>
          </ol>
        </div>
        <div className="dl-hero">
          <h1 className="st-h1">{p.name} a Leaders of Teams: kiedy które?</h1>
          <p className="st-lid">
            {p.name} to {model}
          </p>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 14,
              color: 'var(--text-muted)',
              maxWidth: '66ch',
            }}
          >
            Piszemy o modelach, nie o cenach — te się zmieniają. Jeśli Twoja potrzeba pasuje do
            pierwszej listy, idź tam. Jeśli do drugiej, zostań.
          </p>
        </div>
        <div
          className="st-sek"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))',
            gap: 16,
          }}
        >
          <Kolumna tytul={`Kiedy ${p.name}`} punkty={p.kiedyOni} my={false} />
          <Kolumna tytul="Kiedy Leaders of Teams" punkty={p.kiedyMy} my />
        </div>
        <section className="st-sek pyt-l" aria-labelledby="faq">
          <h2 id="faq">Najczęstsze pytania</h2>
          {p.faq.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>
                {f.q}
                <Ico n="caret-down" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
        <section className="koniec" aria-labelledby="sp">
          <div>
            <h2 id="sp">Sprawdź sam</h2>
            <p>Potrzebę opiszesz bez konta.</p>
          </div>
          <div className="ak" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link className="vbtn glowny" href="/zlecenia/nowe">
              Opisz potrzebę
            </Link>
            <Link className="vbtn obrys" href="/liderzy">
              Zobacz Liderów
            </Link>
            <Link className="vbtn obrys" href="/droga">
              Jak działa Drabinka
            </Link>
          </div>
        </section>
        <section className="st-sek">
          <h2>Inne porównania</h2>
          <ul className="br-linki">
            {POROWNANIA.filter((x) => x.slug !== slug).map((x) => (
              <li key={x.slug}>
                <Link href={`/porownanie/${x.slug}`}>
                  {x.name}
                  <Ico n="arrow-right" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="rn-stopka rn-st-szer">
          <Stopka />
        </div>
      </div>
    </RamaPubliczna>
  );
}

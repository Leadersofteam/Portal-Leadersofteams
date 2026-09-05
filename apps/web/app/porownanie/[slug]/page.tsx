import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import { hubBreadcrumbs } from '@/lib/hub';
import { POROWNANIA, porownanie } from '@/lib/porownania';
import { SITE_URL } from '@/lib/site';

// Strona porównawcza (PL4): fraza „X vs alternatywa" to realny ruch z Google.
// Treść w lib/porownania.ts — uczciwa, bez cen konkurencji i bez FUD (ADR-010).
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return POROWNANIA.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = porownanie(slug);
  if (!p) return { title: 'Porównanie' };
  const title = `${p.name} a Leaders of Teams — kiedy które? | Leaders of Teams`;
  const description = `Uczciwe porównanie: kiedy lepszy jest ${p.name}, a kiedy Leaders of Teams — marketplace B2B, w którym status Lidera trzeba zapracować.`;
  return {
    title,
    description,
    alternates: { canonical: `/porownanie/${slug}` },
    openGraph: { title, description, url: `${SITE_URL}/porownanie/${slug}` },
  };
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = porownanie(slug);
  if (!p) notFound();

  return (
    <main className="landing">
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
      <section className="hero">
        <span className="hero-eyebrow">Porównanie</span>
        <h1>
          {p.name} a Leaders of Teams: <span className="gradient-text">kiedy które?</span>
        </h1>
        <p>{p.model}</p>
        <p className="muted">
          Piszemy o modelach, nie o cenach — te się zmieniają. Jeśli Twoja potrzeba pasuje do lewej
          kolumny, idź tam. Jeśli do prawej, zostań.
        </p>
      </section>

      <section className="droga-paths">
        <div className="card">
          <h2>Kiedy {p.name}</h2>
          <ul>
            {p.kiedyOni.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="card accent-edge">
          <h2>Kiedy Leaders of Teams</h2>
          <ul>
            {p.kiedyMy.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <span className="section-eyebrow">FAQ</span>
        <h2>Najczęstsze pytania</h2>
        <div className="faq">
          {p.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section>
        <h2>Sprawdź sam</h2>
        <div className="hero-cta">
          <Link className="btn" href="/zlecenia/nowe">
            Opisz potrzebę (bez konta)
          </Link>
          <Link className="btn secondary" href="/liderzy">
            Zobacz Liderów
          </Link>
          <Link className="btn secondary" href="/droga">
            Jak działa Drabinka
          </Link>
        </div>
        <p className="muted mt-2">
          Inne porównania:{' '}
          {POROWNANIA.filter((x) => x.slug !== slug).map((x, i) => (
            <span key={x.slug}>
              {i > 0 ? ' · ' : ''}
              <Link href={`/porownanie/${x.slug}`}>{x.name}</Link>
            </span>
          ))}
        </p>
      </section>
    </main>
  );
}

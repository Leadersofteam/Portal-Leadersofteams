import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import { ListingCard, type ListingCardData } from '@/components/ui/listing-card';
import { SITE_URL } from '@/lib/site';
import { publicApi } from '@/lib/server-api';

// Hub dla kogoś, kto szuka wykonawcy (PL2). Portal ma TRZY drogi do Lidera
// i do 04.09 żadna strona ich nie zestawiała: gość trafiał na landing dla
// Liderów albo na katalog bez wyjaśnienia. Tu wybiera: opisać potrzebę
// (zlecenie), wziąć gotową usługę albo zapytać konkretnego Lidera.
// Karty poniżej to realne usługi z katalogu — ISR, bez cookies, żeby strona
// była statyczna dla gości i botów.
export const metadata: Metadata = {
  title: 'Szukam wykonawcy — trzy drogi do Lidera | Leaders of Teams',
  description:
    'Opisz potrzebę i zbieraj oferty, wybierz gotową usługę z jawną ceną albo zapytaj konkretnego Lidera. Poziom i oceny Liderów są zapracowane, nie kupione.',
  alternates: { canonical: '/szukam-wykonawcy' },
};

export const revalidate = 300;

const PATHS = [
  {
    title: 'Opisz potrzebę',
    body: 'Nie wiesz jeszcze kto — wiesz co. Publikujesz zlecenie z widełkami, Liderzy odpowiadają ofertą, Ty dopytujesz i wybierasz. Konto zakładasz po opisaniu potrzeby.',
    cta: 'Opublikuj zlecenie',
    href: '/zlecenia/nowe',
    primary: true,
  },
  {
    title: 'Wybierz gotową usługę',
    body: 'Konkretny zakres, deklarowana cena, pakiety. Wysyłasz zapytanie do Lidera i rozmawiacie w wątku — z niego powstaje zlecenie z pełnym cyklem ocen.',
    cta: 'Przeglądaj usługi',
    href: '/uslugi',
    primary: false,
  },
  {
    title: 'Zapytaj konkretnego Lidera',
    body: 'Katalog Liderów z poziomem w Drabince, ocenami i liczbą zrealizowanych zleceń. Wchodzisz na profil, czytasz portfolio, piszesz przez jego usługę.',
    cta: 'Katalog Liderów',
    href: '/liderzy',
    primary: false,
  },
];

export default async function FindContractorPage() {
  const data = await publicApi<{ listings: ListingCardData[] }>('/listings?limit=6').catch(
    () => null,
  );
  const listings = (data?.listings ?? []).slice(0, 6);

  return (
    <main className="landing">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Leaders of Teams', item: SITE_URL },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Szukam wykonawcy',
              item: `${SITE_URL}/szukam-wykonawcy`,
            },
          ],
        }}
      />
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">Szukam wykonawcy</span>
          <h1>
            Trzy drogi do Lidera. <span className="gradient-text">Jedna zasada.</span>
          </h1>
          <p>
            Każdy Lider, którego tu spotkasz, ma poziom zdobyty wyłącznie ocenioną pracą i uznanym
            mentoringiem. Nie da się go kupić ani wyrekrutować — możesz mu zaufać na tyle, na ile
            zaufali mu inni.
          </p>
        </div>
      </section>

      <section className="feature-grid">
        {PATHS.map((p) => (
          <div className="card feature-card" key={p.title}>
            <h2>{p.title}</h2>
            <p>{p.body}</p>
            <Link className={p.primary ? 'btn' : 'btn secondary'} href={p.href}>
              {p.cta} →
            </Link>
          </div>
        ))}
      </section>

      {listings.length > 0 && (
        <section>
          <span className="section-eyebrow">Gotowe usługi</span>
          <h2>Konkretny zakres, jawna cena</h2>
          <div className="feature-grid">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          <p className="mt-2">
            <Link href="/uslugi">Wszystkie usługi →</Link>
          </p>
        </section>
      )}

      <section>
        <p className="muted">
          Reprezentujesz firmę i chcesz wiedzieć więcej? <Link href="/dla-firm">Dla firm →</Link>
        </p>
      </section>
    </main>
  );
}

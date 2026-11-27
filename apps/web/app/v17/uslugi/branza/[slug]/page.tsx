import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import type { ListingCardData } from '@/components/ui/listing-card';
import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Stopka } from '@/components/v17/rama';
import { PasekBranz, UslugiBranzy } from '@/components/v17/reszta-publiczne-listy';
import { RamaPubliczna } from '@/components/v17/reszta-publiczne-rama';
import { hubBreadcrumbs, hubItemList } from '@/lib/hub';
import type { Industry } from '@/lib/hub';
import { industryCopy } from '@/lib/industries-copy';
import { publicApi } from '@/lib/server-api';

// Te same metadane i parametry statyczne co w dzisiejszym hubie — adres i SEO nie zależą od wyglądu.
export { generateMetadata, generateStaticParams } from '@/app/uslugi/branza/[slug]/page';

// Literał: Next czyta konfigurację segmentu statycznie.
export const revalidate = 300;
export const dynamicParams = true;

const PORCJA = 24;

export default async function UslugiBranzyV17({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const branze = await publicApi<{ industries: Industry[] }>('/industries');
  // Błąd zamiast pustki albo 404: ISR zachowa poprzednią dobrą wersję, a bez niej pokaże się error.tsx.
  if (!branze) throw new Error('Hub branżowy: API nie zwróciło branż');
  const industry = branze.industries.find((i) => i.slug === slug);
  if (!industry) notFound();

  const adres = `/listings?industryId=${industry.id}&limit=${PORCJA}`;
  const data = await publicApi<{
    listings: ListingCardData[];
    nextCursor: string | null;
    total?: number;
  }>(adres);
  if (!data) throw new Error(`Hub branżowy ${slug}: API nie zwróciło listy`);
  const lista = data.listings;

  return (
    <RamaPubliczna aktywny="uslugi">
      <JsonLd
        data={hubBreadcrumbs([
          { name: 'Usługi Liderów', path: '/uslugi' },
          { name: industry.name, path: `/uslugi/branza/${slug}` },
        ])}
      />
      {lista.length > 0 && (
        <JsonLd
          data={hubItemList(
            `Usługi Liderów: ${industry.name}`,
            lista.map((o) => ({ name: o.title, path: `/uslugi/${o.slug}` })),
          )}
        />
      )}
      <div className="rn-gl" style={{ display: 'block', paddingBottom: 0 }}>
        <ol className="okruchy" aria-label="Ścieżka">
          <li>
            <Link href="/uslugi">Wszystkie usługi</Link>
          </li>
          <li aria-current="page">{industry.name}</li>
        </ol>
      </div>
      <div className="rn-gl" style={{ paddingTop: 6 }}>
        <h1>Usługi Liderów: {industry.name}</h1>
        <Link className="vbtn glowny br-d" href="/uslugi/nowa">
          <Ico n="plus" />
          Wystaw usługę
        </Link>
      </div>
      <div className="br-gl">
        <p>{industryCopy(slug).uslugi}</p>
        <Link className="vbtn glowny br-m" href="/uslugi/nowa">
          <Ico n="plus" />
          Wystaw usługę
        </Link>
      </div>
      <PasekBranz branze={branze.industries} baza="/uslugi" aktywna={slug} />
      {lista.length === 0 ? (
        <Komunikat
          ikona="storefront"
          tytul="Jeszcze nikt nie wystawił tu usługi"
          opis="Ta branża czeka na pierwszego Lidera. Jesteś nim? Wystaw usługę — albo zobacz otwarte zlecenia w tej branży."
        >
          <Link className="vbtn obrys" href={`/zlecenia/branza/${slug}`}>
            Zlecenia w tej branży
          </Link>
        </Komunikat>
      ) : (
        <UslugiBranzy
          key={slug}
          adres={adres}
          start={lista}
          kursor={data.nextCursor}
          razem={data.total ?? lista.length}
        />
      )}
      <section className="br-sek" aria-labelledby="iw">
        <h2 id="iw">Ta sama branża, inne wejścia</h2>
        <ul className="br-linki">
          <li>
            <Link href={`/zlecenia/branza/${slug}`}>
              Otwarte zlecenia: {industry.name}
              <Ico n="arrow-right" />
            </Link>
          </li>
          <li>
            <Link href={`/liderzy/branza/${slug}`}>
              Liderzy: {industry.name}
              <Ico n="arrow-right" />
            </Link>
          </li>
          <li>
            <Link href={'/dla-firm'}>
              Szukam wykonawcy
              <Ico n="arrow-right" />
            </Link>
          </li>
        </ul>
      </section>
      <div className="rn-stopka">
        <Stopka />
      </div>
    </RamaPubliczna>
  );
}

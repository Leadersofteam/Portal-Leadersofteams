import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Stopka } from '@/components/v17/rama';
import { PasekBranz, ZleceniaBranzy } from '@/components/v17/reszta-publiczne-listy';
import type { ZlecenieBranzy } from '@/components/v17/reszta-publiczne-listy';
import { RamaPubliczna } from '@/components/v17/reszta-publiczne-rama';
import { hubBreadcrumbs, hubItemList } from '@/lib/hub';
import type { Industry } from '@/lib/hub';
import { industryCopy } from '@/lib/industries-copy';
import { publicApi } from '@/lib/server-api';
import { temu } from '@/lib/v17';

// Te same metadane i parametry statyczne co w dzisiejszym hubie — adres i SEO nie zależą od wyglądu.
export { generateMetadata, generateStaticParams } from '@/app/zlecenia/branza/[slug]/page';

// Literał: Next czyta konfigurację segmentu statycznie.
export const revalidate = 300;
export const dynamicParams = true;

const PORCJA = 24;

export default async function ZleceniaBranzyV17({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const branze = await publicApi<{ industries: Industry[] }>('/industries');
  // Błąd zamiast pustki albo 404: ISR zachowa poprzednią dobrą wersję, a bez niej pokaże się error.tsx.
  if (!branze) throw new Error('Hub branżowy: API nie zwróciło branż');
  const industry = branze.industries.find((i) => i.slug === slug);
  if (!industry) notFound();

  const adres = `/orders?industryId=${industry.id}&limit=${PORCJA}`;
  const data = await publicApi<{
    orders: ZlecenieBranzy[];
    nextCursor: string | null;
    total?: number;
  }>(adres);
  if (!data) throw new Error(`Hub branżowy ${slug}: API nie zwróciło listy`);
  const lista = data.orders;

  return (
    <RamaPubliczna aktywny="zlecenia">
      <JsonLd
        data={hubBreadcrumbs([
          { name: 'Zlecenia', path: '/zlecenia' },
          { name: industry.name, path: `/zlecenia/branza/${slug}` },
        ])}
      />
      {lista.length > 0 && (
        <JsonLd
          data={hubItemList(
            `Zlecenia: ${industry.name}`,
            lista.map((o) => ({ name: o.title, path: `/zlecenia/${o.id}` })),
          )}
        />
      )}
      <div className="rn-gl" style={{ display: 'block', paddingBottom: 0 }}>
        <ol className="okruchy" aria-label="Ścieżka">
          <li>
            <Link href="/zlecenia">Wszystkie zlecenia</Link>
          </li>
          <li aria-current="page">{industry.name}</li>
        </ol>
      </div>
      <div className="rn-gl" style={{ paddingTop: 6 }}>
        <h1>Zlecenia: {industry.name}</h1>
        <Link className="vbtn glowny br-d" href="/zlecenia/nowe">
          <Ico n="plus" />
          Dodaj zlecenie
        </Link>
      </div>
      <div className="br-gl">
        <p>{industryCopy(slug).zlecenia}</p>
        <Link className="vbtn glowny br-m" href="/zlecenia/nowe">
          <Ico n="plus" />
          Dodaj zlecenie
        </Link>
      </div>
      <PasekBranz branze={branze.industries} baza="/zlecenia" aktywna={slug} />
      {lista.length === 0 ? (
        <Komunikat
          ikona="clipboard-text"
          tytul="Brak otwartych zleceń w tej branży"
          opis="Masz potrzebę z tego obszaru? Opisz ją — bez konta na start. Szukasz pracy? Zobacz, co oferują Liderzy tej branży."
        >
          <Link className="vbtn obrys" href={`/uslugi/branza/${slug}`}>
            Usługi w tej branży
          </Link>
        </Komunikat>
      ) : (
        <ZleceniaBranzy
          key={slug}
          adres={adres}
          start={lista.map((o) => ({ ...o, kiedy: o.publishedAt ? temu(o.publishedAt) : '' }))}
          kursor={data.nextCursor}
          razem={data.total ?? lista.length}
        />
      )}
      <section className="br-sek" aria-labelledby="iw">
        <h2 id="iw">Ta sama branża, inne wejścia</h2>
        <ul className="br-linki">
          <li>
            <Link href={`/uslugi/branza/${slug}`}>
              Usługi Liderów: {industry.name}
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
              Dla firm
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

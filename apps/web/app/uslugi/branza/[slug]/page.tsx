import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import { IndustryChips } from '@/components/ui/industry-chips';
import { ListingCard, type ListingCardData } from '@/components/ui/listing-card';
import {
  hubBreadcrumbs,
  hubItemList,
  hubMetadata,
  hubStaticParams,
  loadIndustries,
} from '@/lib/hub';
import { industryCopy } from '@/lib/industries-copy';
import { publicApi } from '@/lib/server-api';

// Hub branżowy usług (PL4). Statyczny (ISR), z własnym akapitem na branżę
// (lib/industries-copy.ts), okruszkami i listą JSON-LD. Filtr `?industryId=`
// na /uslugi zostaje dla ludzi; hub jest adresem, na który prowadzi Google
// i chipy branż — a kanonik hubu wskazuje na hub, nie na listę z parametrem.
// Literał, nie stała z importu: Next czyta konfigurację segmentu statycznie
// i przy `HUB_REVALIDATE` build padał na „can't recognize the exported config".
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return hubStaticParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = (await loadIndustries()).find((i) => i.slug === slug);
  const name = industry?.name ?? 'Branża';
  return hubMetadata({
    title: `Usługi: ${name} — Liderzy z zapracowanym poziomem | Leaders of Teams`,
    description: industryCopy(slug).uslugi,
    path: `/uslugi/branza/${slug}`,
  });
}

export default async function IndustryListingsHub({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industries = await loadIndustries();
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) notFound();

  const data = await publicApi<{ listings: ListingCardData[]; nextCursor: string | null }>(
    `/listings?industryId=${industry.id}&limit=24`,
  ).catch(() => null);
  const listings = data?.listings ?? [];
  const copy = industryCopy(slug);

  return (
    <main>
      <JsonLd
        data={hubBreadcrumbs([
          { name: 'Usługi Liderów', path: '/uslugi' },
          { name: industry.name, path: `/uslugi/branza/${slug}` },
        ])}
      />
      {listings.length > 0 && (
        <JsonLd
          data={hubItemList(
            `Usługi Liderów: ${industry.name}`,
            listings.map((l) => ({ name: l.title, path: `/uslugi/${l.slug}` })),
          )}
        />
      )}
      <div className="breadcrumbs">
        <Link href="/uslugi">← Wszystkie usługi</Link>
      </div>
      <h1>Usługi Liderów: {industry.name}</h1>
      <p className="muted">{copy.uslugi}</p>

      <IndustryChips industries={industries} base="/uslugi" activeSlug={slug} allHref="/uslugi" />

      {listings.length === 0 ? (
        <div className="card">
          <h3>Jeszcze nikt nie wystawił tu usługi</h3>
          <p className="muted">
            Ta branża czeka na pierwszego Lidera. Jesteś nim?{' '}
            <Link href="/uslugi/nowa">Wystaw usługę</Link> — albo{' '}
            <Link href={`/zlecenia/branza/${slug}`}>zobacz otwarte zlecenia w tej branży</Link>.
          </p>
        </div>
      ) : (
        <div className="feature-grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      <section className="mt-3">
        <h2>Ta sama branża, inne wejścia</h2>
        <p className="muted">
          <Link href={`/zlecenia/branza/${slug}`}>Otwarte zlecenia: {industry.name} →</Link>
          {' · '}
          <Link href={`/liderzy/branza/${slug}`}>Liderzy: {industry.name} →</Link>
          {' · '}
          <Link href="/szukam-wykonawcy">Szukam wykonawcy →</Link>
        </p>
      </section>
    </main>
  );
}

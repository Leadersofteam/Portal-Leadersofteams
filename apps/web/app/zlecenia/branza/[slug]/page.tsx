import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import { IndustryChips } from '@/components/ui/industry-chips';
import { OrderRow, type OrderRowData } from '@/components/ui/order-row';
import {
  hubBreadcrumbs,
  hubItemList,
  hubMetadata,
  hubStaticParams,
  loadIndustries,
} from '@/lib/hub';
import { industryCopy } from '@/lib/industries-copy';
import { publicApi } from '@/lib/server-api';

// Hub branżowy zleceń (PL4) — uzasadnienie jak w /uslugi/branza/[slug].
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
    title: `Zlecenia: ${name} — otwarte na oferty Liderów | Leaders of Teams`,
    description: industryCopy(slug).zlecenia,
    path: `/zlecenia/branza/${slug}`,
  });
}

export default async function IndustryOrdersHub({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industries = await loadIndustries();
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) notFound();

  const data = await publicApi<{ orders: OrderRowData[]; nextCursor: string | null }>(
    `/orders?industryId=${industry.id}&limit=24`,
  ).catch(() => null);
  const orders = data?.orders ?? [];
  const copy = industryCopy(slug);

  return (
    <main>
      <JsonLd
        data={hubBreadcrumbs([
          { name: 'Zlecenia', path: '/zlecenia' },
          { name: industry.name, path: `/zlecenia/branza/${slug}` },
        ])}
      />
      {orders.length > 0 && (
        <JsonLd
          data={hubItemList(
            `Zlecenia: ${industry.name}`,
            orders.map((o) => ({ name: o.title, path: `/zlecenia/${o.id}` })),
          )}
        />
      )}
      <div className="breadcrumbs">
        <Link href="/zlecenia">← Wszystkie zlecenia</Link>
      </div>
      <h1>Zlecenia: {industry.name}</h1>
      <p className="muted">{copy.zlecenia}</p>

      <IndustryChips
        industries={industries}
        base="/zlecenia"
        activeSlug={slug}
        allHref="/zlecenia"
      />

      {orders.length === 0 ? (
        <div className="card">
          <h3>Brak otwartych zleceń w tej branży</h3>
          <p className="muted">
            Masz potrzebę z tego obszaru? <Link href="/zlecenia/nowe">Opisz ją</Link> — bez konta na
            start. Szukasz pracy?{' '}
            <Link href={`/uslugi/branza/${slug}`}>Zobacz, co oferują Liderzy tej branży</Link>.
          </p>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}

      <section className="mt-3">
        <h2>Ta sama branża, inne wejścia</h2>
        <p className="muted">
          <Link href={`/uslugi/branza/${slug}`}>Usługi Liderów: {industry.name} →</Link>
          {' · '}
          <Link href={`/liderzy/branza/${slug}`}>Liderzy: {industry.name} →</Link>
          {' · '}
          <Link href="/dla-firm">Dla firm →</Link>
        </p>
      </section>
    </main>
  );
}

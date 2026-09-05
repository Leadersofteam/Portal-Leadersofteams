import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import { IndustryChips } from '@/components/ui/industry-chips';
import { LeaderRow, type LeaderRowData } from '@/components/ui/leader-row';
import {
  hubBreadcrumbs,
  hubItemList,
  hubMetadata,
  hubStaticParams,
  loadIndustries,
} from '@/lib/hub';
import { industryCopy } from '@/lib/industries-copy';
import { publicApi } from '@/lib/server-api';

// Hub branżowy Liderów (PL4) — uzasadnienie jak w /uslugi/branza/[slug].
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
    title: `Liderzy: ${name} — poziom zapracowany, nie kupiony | Leaders of Teams`,
    description: industryCopy(slug).liderzy,
    path: `/liderzy/branza/${slug}`,
  });
}

export default async function IndustryLeadersHub({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industries = await loadIndustries();
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) notFound();

  const data = await publicApi<{ leaders: LeaderRowData[]; nextCursor: string | null }>(
    `/leaders?industryId=${industry.id}&limit=24`,
  ).catch(() => null);
  const leaders = data?.leaders ?? [];
  const copy = industryCopy(slug);

  return (
    <main>
      <JsonLd
        data={hubBreadcrumbs([
          { name: 'Liderzy', path: '/liderzy' },
          { name: industry.name, path: `/liderzy/branza/${slug}` },
        ])}
      />
      {leaders.length > 0 && (
        <JsonLd
          data={hubItemList(
            `Liderzy: ${industry.name}`,
            leaders.map((l) => ({ name: l.displayName, path: `/liderzy/${l.id}` })),
          )}
        />
      )}
      <div className="breadcrumbs">
        <Link href="/liderzy">← Wszyscy Liderzy</Link>
      </div>
      <h1>Liderzy: {industry.name}</h1>
      <p className="muted">{copy.liderzy}</p>

      <IndustryChips industries={industries} base="/liderzy" activeSlug={slug} allHref="/liderzy" />

      {leaders.length === 0 ? (
        <div className="card">
          <h3>Ta branża nie ma jeszcze Lidera</h3>
          <p className="muted">
            Pierwszy szczebel zaczyna się od pierwszego uznania.{' '}
            <Link href="/droga">Zobacz, jak wygląda Droga Lidera</Link> albo{' '}
            <Link href="/rejestracja">zacznij od poziomu 0</Link>.
          </p>
        </div>
      ) : (
        <div>
          {leaders.map((leader) => (
            <LeaderRow key={leader.id} leader={leader} />
          ))}
        </div>
      )}

      <section className="mt-3">
        <h2>Ta sama branża, inne wejścia</h2>
        <p className="muted">
          <Link href={`/uslugi/branza/${slug}`}>Usługi Liderów: {industry.name} →</Link>
          {' · '}
          <Link href={`/zlecenia/branza/${slug}`}>Otwarte zlecenia: {industry.name} →</Link>
          {' · '}
          <Link href="/droga">Droga Lidera →</Link>
        </p>
      </section>
    </main>
  );
}

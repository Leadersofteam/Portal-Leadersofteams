import { credentialCard, OG_SIZE, levelColor } from '@/lib/og';
import { serverApi } from '@/lib/server-api';

export const alt = 'Usługa Lidera — Leaders of Teams';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface Data {
  listing: {
    title: string;
    priceFrom: number;
    industry: { name: string };
    leader: { displayName: string; level: number };
  };
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await serverApi<Data>(`/listings/slug/${encodeURIComponent(slug)}`).catch(
    () => null,
  );
  const l = data?.listing;

  return credentialCard({
    kicker: 'Usługa Lidera · Leaders of Teams',
    title: l?.title ?? 'Usługa Lidera',
    subtitle: l ? `${l.leader.displayName} · ${l.industry.name}` : undefined,
    chips: l
      ? [
          { label: `od ${new Intl.NumberFormat('pl-PL').format(l.priceFrom)} zł` },
          { label: `Poziom ${l.leader.level} w Drabince`, color: levelColor(l.leader.level) },
        ]
      : [],
  });
}

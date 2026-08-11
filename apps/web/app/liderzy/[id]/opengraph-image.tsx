import { credentialCard, OG_SIZE, levelColor } from '@/lib/og';
import { serverApi } from '@/lib/server-api';

// Dynamiczny obraz OG profilu Lidera — Drabinka jako dzielony, prestiżowy
// credential (nazwisko + poziom + ocena + branża). Wspólny szablon: lib/og.tsx.
export const alt = 'Profil Lidera — Leaders of Teams';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface Data {
  profile: {
    displayName: string;
    headline: string;
    level: number;
    averageRating: number | null;
    reviewCount: number;
    industry: { name: string };
  };
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<Data>(`/leaders/${id}`).catch(() => null);
  const p = data?.profile;

  return credentialCard({
    kicker: 'Profil Lidera · Leaders of Teams',
    title: p?.displayName ?? 'Lider',
    subtitle: p?.headline ?? 'Profil Lidera',
    chips: p
      ? [
          { label: `Poziom ${p.level} w Drabince`, color: levelColor(p.level) },
          ...(p.reviewCount > 0 ? [{ label: `★ ${p.averageRating}/5 (${p.reviewCount})` }] : []),
          ...(p.industry?.name ? [{ label: p.industry.name }] : []),
        ]
      : [],
  });
}

import { credentialCard, OG_SIZE } from '@/lib/og';
import { serverApi } from '@/lib/server-api';

export const alt = 'Grupa branżowa — Leaders of Teams';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface Data {
  group: {
    name: string;
    description: string | null;
    membersCount: number;
    postsCount: number;
    industry: { name: string } | null;
  };
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<Data>(`/groups/${id}`).catch(() => null);
  const g = data?.group;

  return credentialCard({
    kicker: 'Grupa branżowa · Leaders of Teams',
    title: g?.name ?? 'Grupa branżowa',
    subtitle: g?.description?.slice(0, 120) ?? undefined,
    chips: g
      ? [
          { label: `${g.membersCount} członków` },
          { label: `${g.postsCount} wpisów` },
          ...(g.industry ? [{ label: g.industry.name }] : []),
        ]
      : [],
  });
}

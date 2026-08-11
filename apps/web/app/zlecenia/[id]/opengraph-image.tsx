import { formatBudget } from '@/lib/labels';
import { credentialCard, OG_SIZE, levelColor } from '@/lib/og';
import { serverApi } from '@/lib/server-api';

export const alt = 'Zlecenie — Leaders of Teams';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface Data {
  order: {
    title: string;
    industry: { name: string };
    budgetMin: number;
    budgetMax: number;
    minLevel: number;
    companyName: string;
  };
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<Data>(`/orders/${id}`).catch(() => null);
  const o = data?.order;

  return credentialCard({
    kicker: 'Zlecenie · Leaders of Teams',
    title: o?.title ?? 'Zlecenie dla Lidera',
    subtitle: o ? `${o.companyName} · ${o.industry.name}` : undefined,
    chips: o
      ? [
          { label: formatBudget(o.budgetMin, o.budgetMax) },
          ...(o.minLevel > 1
            ? [{ label: `od poziomu ${o.minLevel}`, color: levelColor(o.minLevel) }]
            : []),
        ]
      : [],
  });
}

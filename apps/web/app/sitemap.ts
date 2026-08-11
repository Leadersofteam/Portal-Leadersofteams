import type { MetadataRoute } from 'next';

import { serverApi } from '@/lib/server-api';

import { SITE_URL } from '@/lib/site';

// Dynamiczny sitemap. Statyczne huby + publiczne encje (profile, zlecenia, grupy,
// wątki Q&A) pobierane z API. Ograniczone strony na typ, by nie mnożyć zapytań —
// pełny crawl i tak idzie z linków wewnętrznych. Best-effort: awaria API nie wywala.
export const revalidate = 3600; // odśwież co godzinę

type Entry = MetadataRoute.Sitemap[number];

const url = (path: string): string => `${SITE_URL}${path}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: Entry[] = [
    { url: url('/'), changeFrequency: 'daily', priority: 1 },
    { url: url('/uslugi'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/liderzy'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/zlecenia'), changeFrequency: 'hourly', priority: 0.9 },
    { url: url('/grupy'), changeFrequency: 'daily', priority: 0.7 },
    { url: url('/drabinka'), changeFrequency: 'weekly', priority: 0.6 },
  ];

  const [leaders, orders, groups, listings] = await Promise.all([
    serverApi<{ leaders: Array<{ id: string }> }>('/leaders?limit=50').catch(() => null),
    serverApi<{ orders: Array<{ id: string }> }>('/orders?limit=50').catch(() => null),
    serverApi<{ groups: Array<{ id: string }> }>('/groups?limit=50').catch(() => null),
    serverApi<{ listings: Array<{ slug: string }> }>('/listings?limit=50').catch(() => null),
  ]);

  const listingEntries: Entry[] = (listings?.listings ?? []).map((l) => ({
    url: url(`/uslugi/${l.slug}`),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const leaderEntries: Entry[] = (leaders?.leaders ?? []).map((l) => ({
    url: url(`/liderzy/${l.id}`),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
  const orderEntries: Entry[] = (orders?.orders ?? []).map((o) => ({
    url: url(`/zlecenia/${o.id}`),
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  // Grupy + ich wątki Q&A (najcenniejsze pod long-tail — QAPage rich results).
  const groupList = groups?.groups ?? [];
  const groupEntries: Entry[] = groupList.flatMap((g) => [
    { url: url(`/grupy/${g.id}`), changeFrequency: 'daily', priority: 0.6 },
    { url: url(`/grupy/${g.id}/pytania`), changeFrequency: 'daily', priority: 0.6 },
  ]);
  const threadLists = await Promise.all(
    groupList.map((g) =>
      serverApi<{ threads: Array<{ id: string }> }>(`/groups/${g.id}/threads`).catch(() => null),
    ),
  );
  const threadEntries: Entry[] = threadLists.flatMap(
    (t) =>
      t?.threads.map((th) => ({
        url: url(`/watki/${th.id}`),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })) ?? [],
  );

  return [
    ...staticEntries,
    ...listingEntries,
    ...leaderEntries,
    ...orderEntries,
    ...groupEntries,
    ...threadEntries,
  ];
}

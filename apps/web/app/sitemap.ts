import type { MetadataRoute } from 'next';

import { POROWNANIA } from '@/lib/porownania';
import { publicApi } from '@/lib/server-api';

import { SITE_URL } from '@/lib/site';

// Dynamiczny sitemap. Statyczne huby + publiczne encje (profile, zlecenia, grupy,
// wątki Q&A) pobierane z API. PL4: bez limitu 50 na typ — kursorowa paginacja do
// MAX_PAGES stron po 50 (API nie przyjmuje więcej), przez publicApi (bez cookies,
// z cache). Do 05.09 sitemap miał 55 adresów, bo każda lista była ucięta na 50.
// Best-effort: awaria API nie wywala.
//
// DYNAMICZNY, nie ISR: z `revalidate` Next prerenderował sitemapę przy buildzie
// (bez API → same wpisy statyczne) i serwował ją godzinę po każdym wdrożeniu.
// Dane i tak są cache'owane na poziomie fetch (publicApi, 3600 s), więc koszt
// żądania to złożenie XML-a, nie odpytanie bazy.
export const dynamic = 'force-dynamic';

type Entry = MetadataRoute.Sitemap[number];

const url = (path: string): string => `${SITE_URL}${path}`;

// 20 stron × 50 = 1000 adresów na typ. Powyżej tego Next i tak wymaga podziału
// sitemapy na pliki (generateSitemaps) — wrócimy do tego przy realnych liczbach.
const MAX_PAGES = 20;

/** Zbiera WSZYSTKIE strony listy z kursorem, dopóki API zwraca `nextCursor`. */
async function collectAll<T>(basePath: string, key: string, extra = ''): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const sep = basePath.includes('?') ? '&' : '?';
    const cursorPart: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const res: Record<string, unknown> | null = await publicApi<Record<string, unknown>>(
      `${basePath}${sep}limit=50${extra}${cursorPart}`,
      3600,
    ).catch(() => null);
    if (!res) break;
    const rows = (res[key] as T[] | undefined) ?? [];
    out.push(...rows);
    cursor = (res.nextCursor as string | null | undefined) ?? null;
    if (!cursor || rows.length === 0) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: Entry[] = [
    { url: url('/'), changeFrequency: 'daily', priority: 1 },
    { url: url('/uslugi'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/liderzy'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/zlecenia'), changeFrequency: 'hourly', priority: 0.9 },
    { url: url('/grupy'), changeFrequency: 'daily', priority: 0.7 },
    { url: url('/drabinka'), changeFrequency: 'weekly', priority: 0.6 },
    // PL3: Droga Lidera jako opowieść — strona wejściowa dla aspirujących.
    { url: url('/droga'), changeFrequency: 'weekly', priority: 0.9 },
    // PL2: wejścia dla drugiej strony rynku.
    { url: url('/dla-firm'), changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/szukam-wykonawcy'), changeFrequency: 'weekly', priority: 0.8 },
    // PL4: baza wiedzy Q&A i strony porównawcze.
    { url: url('/pytania'), changeFrequency: 'daily', priority: 0.7 },
    ...POROWNANIA.map((p): Entry => ({
      url: url(`/porownanie/${p.slug}`),
      changeFrequency: 'monthly',
      priority: 0.6,
    })),
  ];

  const [leaderRows, orderRows, groupRows, listingRows, industriesData] = await Promise.all([
    collectAll<{ id: string }>('/leaders', 'leaders'),
    collectAll<{ id: string }>('/orders', 'orders'),
    collectAll<{ id: string }>('/groups', 'groups'),
    collectAll<{ slug: string }>('/listings', 'listings'),
    publicApi<{ industries: Array<{ slug: string }> }>('/industries', 3600).catch(() => null),
  ]);
  const leaders = { leaders: leaderRows };
  const orders = { orders: orderRows };
  const groups = { groups: groupRows };
  const listings = { listings: listingRows };

  // PL4: huby branżowe — trzy wejścia na każdą branżę.
  const hubEntries: Entry[] = (industriesData?.industries ?? []).flatMap((i) => [
    { url: url(`/uslugi/branza/${i.slug}`), changeFrequency: 'daily', priority: 0.8 },
    { url: url(`/zlecenia/branza/${i.slug}`), changeFrequency: 'hourly', priority: 0.8 },
    { url: url(`/liderzy/branza/${i.slug}`), changeFrequency: 'daily', priority: 0.8 },
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
  // Wątki ponad grupami jednym strumieniem (nowa trasa /threads, PL4) zamiast
  // zapytania per grupa — 20 grup = 20 zapytań, a rośnie z każdą nową.
  const threadRows = await collectAll<{ id: string }>('/threads', 'threads');
  const threadEntries: Entry[] = threadRows.map((th) => ({
    url: url(`/watki/${th.id}`),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...hubEntries,
    ...listingEntries,
    ...leaderEntries,
    ...orderEntries,
    ...groupEntries,
    ...threadEntries,
  ];
}

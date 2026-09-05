import type { Metadata } from 'next';

import { publicApi } from '@/lib/server-api';
import { SITE_URL } from '@/lib/site';

// Wspólne dla trzech hubów branżowych (PL4): odczyt branż z zapasem na czas
// builda, dopasowanie slug → branża, okruszki JSON-LD i canonical.
export interface Industry {
  id: string;
  name: string;
  slug: string;
}

export const HUB_REVALIDATE = 300;

export async function loadIndustries(): Promise<Industry[]> {
  const data = await publicApi<{ industries: Industry[] }>('/industries').catch(() => null);
  return data?.industries ?? [];
}

/**
 * Slugi do generateStaticParams — WYŁĄCZNIE z API. Bez API (czas `next build`)
 * zwracamy pustą listę: huby powstają na żądanie przy pierwszym wejściu
 * (dynamicParams) i dopiero wtedy wchodzą do cache ISR. Pierwsza wersja
 * podstawiała tu slugi z lustra seeda — strona nie miała wtedy nazwy ani id
 * branży, robiła `notFound()` i Next ZAMRAŻAŁ 404 na 5 minut po każdym
 * wdrożeniu (e2e złapało; mina „ISR prerenderowana bez API" w MINY).
 */
export async function hubStaticParams(): Promise<Array<{ slug: string }>> {
  const industries = await loadIndustries();
  return industries.map((i) => ({ slug: i.slug }));
}

export function hubMetadata(input: { title: string; description: string; path: string }): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url: `${SITE_URL}${input.path}`,
    },
  };
}

export function hubBreadcrumbs(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Leaders of Teams', item: SITE_URL },
      ...items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: it.name,
        item: `${SITE_URL}${it.path}`,
      })),
    ],
  };
}

export function hubItemList(name: string, urls: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: urls.length,
    itemListElement: urls.map((u, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: u.name,
      url: `${SITE_URL}${u.path}`,
    })),
  };
}

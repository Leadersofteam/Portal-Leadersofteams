import type { Cache } from '../../shared/cache';
import { DomainError } from '../../shared/errors';
import type { CommunityService } from '../community/index';
import type { IdentityService } from '../identity/index';
import type { ListingsService } from '../listings/index';
import type { LadderService } from '../ladder/index';
import type { OrdersService, ProfilesService } from '../marketplace/index';
import type { SocialService } from '../social/index';

// Moduł search — jedno pole na cały Portal.
//
// GRANICE (ADR-002): ten moduł NIE dotyka cudzych tabel. Każdy moduł wystawia
// własną funkcję wyszukującą przez swoje publiczne API, a search je tylko
// komponuje. Dzięki temu wyszukiwarka nie zna schematu ani reguł widoczności
// żadnej domeny — a każda domena może zmienić swoje zapytanie bez ruszania tego
// pliku.

export interface SearchDeps {
  listings: Pick<ListingsService, 'list'>;
  orders: Pick<OrdersService, 'listPublished'>;
  profiles: Pick<ProfilesService, 'listPublicLeaders'>;
  community: Pick<CommunityService, 'searchThreads'>;
  social: Pick<SocialService, 'searchPosts'>;
  identity: Pick<IdentityService, 'getPublicUsers'>;
  // Poziom Drabinki nie jest polem profilu — to projekcja modułu ladder,
  // doklejana w warstwie odczytu (tak samo robi to katalog Liderów).
  ladder: Pick<LadderService, 'getLevels'>;
  cache?: Cache;
}

export const SEARCH_NS = 'search';
const SEARCH_TTL = 60;
const PER_SCOPE = 8;

export type SearchScope = 'all' | 'listings' | 'leaders' | 'orders' | 'posts' | 'threads';

export function createSearchService({
  listings,
  orders,
  profiles,
  community,
  social,
  identity,
  ladder,
  cache,
}: SearchDeps) {
  async function load(q: string, scope: SearchScope) {
    const want = (s: SearchScope) => scope === 'all' || scope === s;

    const [listingRes, orderRes, leaderRes, threadRes, postRes] = await Promise.all([
      want('listings') ? listings.list({ q, limit: PER_SCOPE, sort: 'newest' }) : null,
      want('orders') ? orders.listPublished({ q, limit: PER_SCOPE }) : null,
      want('leaders') ? profiles.listPublicLeaders({ q, limit: PER_SCOPE }) : null,
      want('threads') ? community.searchThreads(q, PER_SCOPE) : null,
      want('posts') ? social.searchPosts(q, PER_SCOPE) : null,
    ]);

    // Autorzy wpisów i poziomy Liderów — dociągane hurtem, bez N+1.
    const posts = postRes ?? [];
    const rawLeaders = leaderRes?.leaders ?? [];
    const rawListings = listingRes?.listings ?? [];

    // Jedno zapytanie po WSZYSTKIE osoby w wynikach: autorzy wpisów i Liderzy
    // stojący za usługami (ServiceListing niesie tylko userId profilu).
    const peopleIds = [
      ...new Set([
        ...posts.map((p) => p.authorUserId),
        ...rawListings.map((l) => l.leaderProfile.userId),
      ]),
    ];

    const [authors, levels] = await Promise.all([
      peopleIds.length ? identity.getPublicUsers(peopleIds) : Promise.resolve(new Map()),
      rawLeaders.length || rawListings.length
        ? ladder.getLevels([
            ...new Set([
              ...rawLeaders.map((l) => l.userId),
              ...rawListings.map((l) => l.leaderProfile.userId),
            ]),
          ])
        : Promise.resolve(new Map<string, number>()),
    ]);

    return {
      q,
      scope,
      listings: rawListings.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        priceFrom: l.priceFrom,
        leader: {
          displayName: authors.get(l.leaderProfile.userId)?.displayName ?? 'Lider',
          level: levels.get(l.leaderProfile.userId) ?? 0,
          avatarFileId: authors.get(l.leaderProfile.userId)?.avatarFileId ?? null,
        },
      })),
      orders: orderRes?.orders ?? [],
      leaders: rawLeaders.map((l) => ({
        id: l.id,
        displayName: l.displayName,
        headline: l.headline,
        avatarFileId: l.avatarFileId,
        level: levels.get(l.userId) ?? 0,
      })),
      threads: threadRes ?? [],
      posts: posts.map((p) => ({
        id: p.id,
        excerpt: p.excerpt,
        createdAt: p.createdAt,
        author: {
          id: p.authorUserId,
          displayName: authors.get(p.authorUserId)?.displayName ?? 'Użytkownik',
          handle: authors.get(p.authorUserId)?.handle ?? null,
        },
      })),
      counts: {
        listings: rawListings.length,
        orders: orderRes?.orders.length ?? 0,
        leaders: rawLeaders.length,
        threads: threadRes?.length ?? 0,
        posts: posts.length,
      },
    };
  }

  return {
    async search(rawQuery: string, scope: SearchScope = 'all') {
      const q = rawQuery.trim();
      if (q.length < 2) {
        throw new DomainError('SEARCH_QUERY_TOO_SHORT', 'Wpisz co najmniej 2 znaki', 400);
      }
      if (q.length > 80) {
        throw new DomainError('SEARCH_QUERY_TOO_LONG', 'Zapytanie jest za długie', 400);
      }

      // Wyniki nie zależą od widza (wszystko publiczne), więc cache jest
      // bezpieczny. Jest też OBOWIĄZKOWY: scope=all to pięć zapytań na żądanie,
      // czyli najdroższy endpoint w Portalu na współdzielonym VPS (ADR-005).
      if (!cache) return load(q, scope);
      return cache.getOrSet(SEARCH_NS, { scope, q: q.toLowerCase() }, SEARCH_TTL, () =>
        load(q, scope),
      );
    },
  };
}

export type SearchService = ReturnType<typeof createSearchService>;

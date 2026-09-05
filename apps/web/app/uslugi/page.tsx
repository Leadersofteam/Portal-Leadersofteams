import Link from 'next/link';

import { EmptyState } from '@/components/ui/empty-state';
import { ListingCard, type ListingCardData } from '@/components/ui/listing-card';
import { IndustryChips } from '@/components/ui/industry-chips';
import { publicApi } from '@/lib/server-api';

import { ListingFilters } from './listing-filters';

// Typ karty żyje przy komponencie (components/ui/listing-card) — tu tylko alias
// dla dotychczasowych importerów.
export type { ListingCardData as ListingCard } from '@/components/ui/listing-card';

interface Industry {
  id: string;
  name: string;
  slug: string;
}

export const metadata = {
  title: 'Usługi Liderów — katalog | Leaders of Teams',
  description:
    'Katalog usług Liderów Leaders of Teams: jasny zakres, deklarowane widełki cen i poziom w Drabince zdobyty realną pracą. Wyślij zapytanie i przekształć je w zlecenie.',
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['industryId', 'q', 'tag', 'priceMin', 'priceMax', 'sort', 'cursor'] as const) {
    const value = params[key];
    if (typeof value === 'string' && value) query.set(key, value);
  }

  const [data, industriesData, tagsData] = await Promise.all([
    // PL4: publicApi — katalog jest publiczny, bez cookies (uzasadnienie w /zlecenia).
    publicApi<{ listings: ListingCardData[]; nextCursor: string | null }>(
      `/listings?${query.toString()}`,
      0,
    ),
    publicApi<{ industries: Industry[] }>('/industries'),
    publicApi<{ tags: Array<{ name: string; slug: string; count: number }> }>(
      '/listings/tags/popular',
    ),
  ]);
  const listings = data?.listings ?? [];
  const industries = industriesData?.industries ?? [];
  const popularTags = tagsData?.tags ?? [];
  const activeTag = typeof params.tag === 'string' ? params.tag : '';
  const hasFilters = Boolean(
    activeTag ||
    (typeof params.q === 'string' && params.q) ||
    (typeof params.industryId === 'string' && params.industryId) ||
    (typeof params.priceMax === 'string' && params.priceMax),
  );

  const nextParams = new URLSearchParams(query);
  if (data?.nextCursor) nextParams.set('cursor', data.nextCursor);

  return (
    <main>
      <h1>Usługi Liderów</h1>
      <p className="muted">
        Konkretny zakres, deklarowane ceny i poziom w Drabince, którego nie da się kupić. Zapytanie
        możesz jednym kliknięciem przekształcić w zlecenie z pełnym cyklem ocen.
      </p>

      {/* PL4: chipy branż → huby /uslugi/branza/[slug] (statyczne, indeksowalne). */}
      <IndustryChips industries={industries} base="/uslugi" allHref="/uslugi" />

      {/* Chipy popularnych tagów. To nie ozdoba: `innodb_ft_min_token_size`
          wynosi 3, więc frazy „HR", „IT", „AI" NIGDY nie wejdą do indeksu
          FULLTEXT i nie da się ich wyszukać — tag jest jedyną drogą do tych
          kategorii. Filtrowanie zwykłym linkiem, więc działa też bez JS. */}
      {popularTags.length > 0 && (
        <ul className="tag-chips" aria-label="Popularne tagi">
          {activeTag && (
            <li>
              <Link className="tag-chip" href="/uslugi">
                × Wyczyść tag
              </Link>
            </li>
          )}
          {popularTags.map((tag) => (
            <li key={tag.slug}>
              <Link
                className={activeTag === tag.slug ? 'tag-chip active' : 'tag-chip'}
                href={`/uslugi?tag=${encodeURIComponent(tag.slug)}`}
              >
                {tag.name} <span className="muted">({tag.count})</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Na 390 px cztery pola filtrów spychały pierwszą kartę o cały ekran —
          zwijamy je za przyciskiem (ListingFilters); desktop widzi je od razu. */}
      <ListingFilters>
        <form className="filters" method="get">
          <div className="field">
            <label htmlFor="q">Szukaj</label>
            <input
              id="q"
              name="q"
              defaultValue={typeof params.q === 'string' ? params.q : ''}
              placeholder="np. automatyzacja sprzedaży"
            />
          </div>
          <div className="field">
            <label htmlFor="industryId">Branża</label>
            <select
              id="industryId"
              name="industryId"
              defaultValue={typeof params.industryId === 'string' ? params.industryId : ''}
            >
              <option value="">Wszystkie</option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="priceMax">Cena do (zł)</label>
            <input
              id="priceMax"
              name="priceMax"
              type="number"
              min={0}
              defaultValue={typeof params.priceMax === 'string' ? params.priceMax : ''}
            />
          </div>
          <div className="field">
            <label htmlFor="sort">Sortowanie</label>
            <select
              id="sort"
              name="sort"
              defaultValue={typeof params.sort === 'string' ? params.sort : 'newest'}
            >
              <option value="newest">Najnowsze</option>
              <option value="price_asc">Cena: od najniższej</option>
              <option value="price_desc">Cena: od najwyższej</option>
            </select>
          </div>
          <button className="btn" type="submit">
            Filtruj
          </button>
        </form>
      </ListingFilters>

      {listings.length === 0 ? (
        /* CTA zależne od kontekstu (ux-copy, PD4): przy aktywnych filtrach
           „pierwszą usługę" byłoby nieprawdą — usługi są, tylko odfiltrowane. */
        hasFilters ? (
          <EmptyState
            art="search"
            title="Brak usług spełniających kryteria"
            ctaHref="/uslugi"
            ctaLabel="Wyczyść filtry"
          >
            Poluzuj kryteria — pełna lista usług czeka obok.
          </EmptyState>
        ) : (
          <EmptyState
            art="rung"
            title="Nikt jeszcze nie opublikował usługi"
            ctaHref="/uslugi/nowa"
            ctaLabel="Opublikuj pierwszą usługę"
          >
            Jeśli jesteś Liderem — pokaż firmom, co potrafisz. Twoja usługa będzie tu pierwsza.
          </EmptyState>
        )
      ) : (
        <div className="feature-grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {data?.nextCursor && (
        <p className="mt-3">
          <Link className="btn secondary" href={`/uslugi?${nextParams.toString()}`}>
            Wczytaj więcej
          </Link>
        </p>
      )}
    </main>
  );
}

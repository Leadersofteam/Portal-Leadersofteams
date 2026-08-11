import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LevelBadge } from '@/components/ui/level-badge';
import { serverApi } from '@/lib/server-api';

import { FavoriteStar } from './favorite-star';

export interface ListingCard {
  id: string;
  slug: string;
  title: string;
  priceFrom: number;
  images: string[];
  tags: Array<{ name: string; slug: string }>;
  packages: Array<{ tier: string; priceDeclared: number; deliveryDays: number }>;
  industry: { id: string; name: string };
  isFavorite?: boolean;
  leader: {
    displayName: string;
    avatarFileId: string | null;
    level: number;
    averageRating: number | null;
    reviewCount: number;
  };
}

interface Industry {
  id: string;
  name: string;
}

export const metadata = {
  title: 'Usługi Liderów — katalog | Leaders of Teams',
  description:
    'Katalog usług Liderów Leaders of Teams: jasny zakres, deklarowane widełki cen i poziom w Drabince zdobyty realną pracą. Wyślij zapytanie i przekształć je w zlecenie.',
};

const plnFormat = new Intl.NumberFormat('pl-PL');

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

  const [data, industriesData] = await Promise.all([
    serverApi<{ listings: ListingCard[]; nextCursor: string | null }>(
      `/listings?${query.toString()}`,
    ),
    serverApi<{ industries: Industry[] }>('/industries'),
  ]);
  const listings = data?.listings ?? [];
  const industries = industriesData?.industries ?? [];

  const nextParams = new URLSearchParams(query);
  if (data?.nextCursor) nextParams.set('cursor', data.nextCursor);

  return (
    <main>
      <h1>Usługi Liderów</h1>
      <p className="muted">
        Konkretny zakres, deklarowane ceny i poziom w Drabince, którego nie da się kupić. Zapytanie
        możesz jednym kliknięciem przekształcić w zlecenie z pełnym cyklem ocen.
      </p>

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

      {listings.length === 0 ? (
        <EmptyState
          title="Brak usług spełniających kryteria"
          ctaHref="/uslugi/nowa"
          ctaLabel="Opublikuj pierwszą usługę"
        >
          Zmień filtry — albo, jeśli jesteś Liderem, pokaż firmom, co potrafisz.
        </EmptyState>
      ) : (
        <div className="feature-grid">
          {listings.map((listing) => (
            <div key={listing.id} className="card listing-card">
              {listing.images[0] && (
                <img
                  src={`/api/v1/files/${listing.images[0]}/full`}
                  alt=""
                  className="portfolio-image"
                  loading="lazy"
                />
              )}
              <div className="listing-fav">
                <FavoriteStar listingId={listing.id} initial={listing.isFavorite ?? false} />
              </div>
              <h3>
                <Link href={`/uslugi/${listing.slug}`}>{listing.title}</Link>
              </h3>
              <div
                className="mt-1"
                style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}
              >
                <Avatar
                  name={listing.leader.displayName}
                  size="sm"
                  src={
                    listing.leader.avatarFileId
                      ? `/api/v1/files/${listing.leader.avatarFileId}/thumb`
                      : null
                  }
                />
                <span className="meta">{listing.leader.displayName}</span>
                <LevelBadge level={listing.leader.level} />
              </div>
              <p className="muted mt-1">
                {listing.industry.name}
                {listing.leader.reviewCount > 0
                  ? ` · ★ ${listing.leader.averageRating}/5 (${listing.leader.reviewCount})`
                  : ''}
              </p>
              <p className="mt-1">
                <strong>od {plnFormat.format(listing.priceFrom)} zł</strong>{' '}
                <span className="muted">· {listing.packages.length} pakiet(y)</span>
              </p>
            </div>
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

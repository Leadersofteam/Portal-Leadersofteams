import Link from 'next/link';

import { FavoriteStar } from '@/app/uslugi/favorite-star';
import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/ui/level-badge';
import { levelName } from '@/lib/levels';

/**
 * Karta usługi (PD3) — jedno miejsce zamiast trzech kopii (katalog, ulubione).
 *
 * Sedno przebudowy: ślad zaufania przestaje być dopiskiem w `muted` obok nazwy
 * branży — ocena i zrealizowane zlecenia dostają własny pas (.trust-strip),
 * bo to one odpowiadają na pytanie firmy „czy temu człowiekowi mogę zapłacić".
 * Design opowiada zasadę Portalu: status trzeba zapracować — więc zapracowane
 * musi być widoczne.
 */
export interface ListingCardData {
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
    completedOrders: number;
  };
}

const plnFormat = new Intl.NumberFormat('pl-PL');

// Polska liczba mnoga: 1 zlecenie / 2–4 zlecenia / 5+ zleceń (z wyjątkiem 12–14).
export function odmienZlecenia(n: number): string {
  if (n === 1) return 'zrealizowane zlecenie';
  const d = n % 10;
  const h = n % 100;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'zrealizowane zlecenia';
  return 'zrealizowanych zleceń';
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const { leader } = listing;
  const hasTrust = leader.reviewCount > 0 || leader.completedOrders > 0;
  return (
    <div className="card listing-card">
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
      <div className="listing-author">
        <Avatar
          name={leader.displayName}
          size="sm"
          src={leader.avatarFileId ? `/api/v1/files/${leader.avatarFileId}/thumb` : null}
        />
        <span className="meta">{leader.displayName}</span>
        <LevelBadge level={leader.level} name={levelName(leader.level)} />
      </div>
      {/* Pas zaufania: tylko fakty zapracowane. Świeży Lider bez historii nie
          dostaje pustych zer ani „brak ocen" — cisza zamiast piętna. */}
      {hasTrust && (
        <p className="trust-strip">
          {leader.reviewCount > 0 && (
            <span className="trust-fact">
              <span aria-hidden="true">★</span> {leader.averageRating}/5
              <span className="muted"> ({leader.reviewCount})</span>
            </span>
          )}
          {leader.completedOrders > 0 && (
            <span className="trust-fact">
              {leader.completedOrders} {odmienZlecenia(leader.completedOrders)}
            </span>
          )}
        </p>
      )}
      <p className="muted mt-1">{listing.industry.name}</p>
      <p className="mt-1">
        <strong className="listing-price">od {plnFormat.format(listing.priceFrom)} zł</strong>{' '}
        <span className="muted">· {listing.packages.length} pakiet(y)</span>
      </p>
    </div>
  );
}

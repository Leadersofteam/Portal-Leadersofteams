import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LevelBadge } from '@/components/ui/level-badge';
import { serverApi } from '@/lib/server-api';

import { FavoriteStar } from '../../uslugi/favorite-star';
import type { ListingCard } from '../../uslugi/page';

export const metadata = { title: 'Ulubione usługi — Leaders of Teams' };

const plnFormat = new Intl.NumberFormat('pl-PL');

// „Moje ulubione" (S18). `GET /me/favorites` istniało od Sprintu 7 i nie miało
// ŻADNEJ strony: gwiazdka w katalogu zapisywała usługę, po czym ta usługa
// znikała z pola widzenia na zawsze. Ten sam wzorzec co `POST /groups` i RODO —
// trasa z testami, do której użytkownik nie ma jak dojść.
//
// Strona leży pod `/panel`, więc robots.ts wyklucza ją z indeksacji razem z całą
// strefą; wzorzec zgodny z `/panel/zapisane`, które jest tym samym dla treści.
export default async function FavoritesPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const data = await serverApi<{ listings: ListingCard[] }>('/me/favorites');
  const listings = data?.listings ?? [];

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Baza wspinacza</Link>
      </div>

      <h1>Ulubione usługi</h1>
      <p className="muted">
        Prywatna lista — nikt nie widzi, co zapisujesz, i nigdzie nie ma licznika ulubionych. Usługa
        wstrzymana lub zarchiwizowana przez Lidera znika stąd sama.
      </p>

      {listings.length === 0 ? (
        <EmptyState
          art="search"
          title="Nic tu jeszcze nie leży"
          ctaHref="/uslugi"
          ctaLabel="Przejrzyj usługi"
        >
          Kliknij gwiazdkę przy usłudze w katalogu, a wróci tutaj — także za tydzień.
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
                {/* `initial` zawsze true — to lista ulubionych, więc gwiazdka
                    służy tu wyłącznie do zdjęcia z półki. Dokładnie jak
                    `initialActive` w /panel/zapisane. */}
                <FavoriteStar listingId={listing.id} initial />
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
    </main>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/ui/empty-state';
import { ListingCard, type ListingCardData } from '@/components/ui/listing-card';
import { serverApi } from '@/lib/server-api';

export const metadata = { title: 'Ulubione usługi — Leaders of Teams' };

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

  const data = await serverApi<{ listings: ListingCardData[] }>('/me/favorites');
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
          {/* `isFavorite: true` na sztywno — to lista ulubionych, gwiazdka służy
              tu wyłącznie do zdjęcia z półki (jak initialActive w /panel/zapisane). */}
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={{ ...listing, isFavorite: true }} />
          ))}
        </div>
      )}
    </main>
  );
}

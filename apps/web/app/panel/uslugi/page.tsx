import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/ui/empty-state';
import { serverApi } from '@/lib/server-api';

import { ListingActions } from './listing-actions';

export const metadata = { title: 'Moje usługi i zapytania — Leaders of Teams' };

interface MyListing {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
  priceFrom: number;
}

interface InquiryRow {
  id: string;
  status: 'OPEN' | 'CONVERTED' | 'CLOSED';
  listingTitle: string;
  listingSlug: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Szkic',
  PUBLISHED: 'Opublikowana',
  PAUSED: 'Wstrzymana',
  ARCHIVED: 'Zarchiwizowana',
  OPEN: 'Otwarte',
  CONVERTED: 'Przekształcone w zlecenie',
  CLOSED: 'Zamknięte',
};

const plnFormat = new Intl.NumberFormat('pl-PL');

export default async function MyListingsPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const [listingsData, inquiriesData] = await Promise.all([
    serverApi<{ listings: MyListing[] }>('/me/listings').catch(() => null),
    serverApi<{ asLeader: InquiryRow[]; asCompany: InquiryRow[] }>('/me/inquiries'),
  ]);
  const listings = listingsData?.listings ?? [];
  const asLeader = inquiriesData?.asLeader ?? [];
  const asCompany = inquiriesData?.asCompany ?? [];

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link>
      </div>
      <h1>Moje usługi</h1>
      <div className="actions-row">
        <Link className="btn" href="/uslugi/nowa">
          Dodaj usługę
        </Link>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          art="rung"
          title="Nie masz jeszcze żadnej usługi"
          ctaHref="/uslugi/nowa"
          ctaLabel="Opublikuj pierwszą usługę"
        >
          Usługa to Twoja oferta w katalogu — firmy wysyłają zapytania, a Ty zamieniasz je w
          zlecenia z ocenami liczonymi do Drabinki.
        </EmptyState>
      ) : (
        listings.map((listing) => (
          /* --stack (PD3): z trzema akcjami prawa kolumna na 390 px spadała
             pod lewą bez wyrównania — modyfikator robi z tego świadomy stos. */
          <div key={listing.id} className="list-row list-row--stack">
            <div>
              <h3>
                <Link href={`/uslugi/${listing.slug}`}>{listing.title}</Link>
              </h3>
              <div className="meta">
                od {plnFormat.format(listing.priceFrom)} zł ·{' '}
                <span className="badge">{STATUS_LABELS[listing.status]}</span>
              </div>
            </div>
            <div className="list-row-aside">
              <ListingActions listingId={listing.id} slug={listing.slug} status={listing.status} />
            </div>
          </div>
        ))
      )}

      <h2>Zapytania o moje usługi</h2>
      {asLeader.length === 0 ? (
        <p className="muted">Brak zapytań — jeszcze żadna firma nie napisała.</p>
      ) : (
        asLeader.map((inq) => (
          <div key={inq.id} className="list-row">
            <div>
              <h3>
                <Link href={`/zapytania/${inq.id}`}>{inq.listingTitle}</Link>
              </h3>
              <div className="meta">{STATUS_LABELS[inq.status]}</div>
            </div>
          </div>
        ))
      )}

      <h2>Moje zapytania (jako Firma)</h2>
      {asCompany.length === 0 ? (
        <p className="muted">
          Brak wysłanych zapytań. <Link href="/uslugi">Przeglądaj katalog usług</Link>.
        </p>
      ) : (
        asCompany.map((inq) => (
          <div key={inq.id} className="list-row">
            <div>
              <h3>
                <Link href={`/zapytania/${inq.id}`}>{inq.listingTitle}</Link>
              </h3>
              <div className="meta">{STATUS_LABELS[inq.status]}</div>
            </div>
          </div>
        ))
      )}
    </main>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { OFFER_STATUS_LABELS, ORDER_STATUS_LABELS } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

interface MyOffer {
  id: string;
  status: string;
  proposedBudget: number | null;
  order: { id: string; title: string; status: string };
}

export const metadata = { title: 'Moje oferty — Leaders of Teams' };

export default async function MyOffersPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const data = await serverApi<{ offers: MyOffer[] }>('/me/offers');
  const offers = data?.offers ?? [];

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link>
      </div>
      <h1>Moje oferty</h1>
      {offers.length === 0 ? (
        <p className="muted">
          Nie złożyłeś jeszcze żadnej oferty. <Link href="/zlecenia">Przeglądaj zlecenia →</Link>
        </p>
      ) : (
        offers.map((offer) => (
          <div key={offer.id} className="list-row">
            <div>
              <h3>
                <Link href={`/zlecenia/${offer.order.id}`}>{offer.order.title}</Link>
              </h3>
              <div className="meta">
                Zlecenie: {ORDER_STATUS_LABELS[offer.order.status] ?? offer.order.status}
                {offer.proposedBudget ? ` · Twoja propozycja: ${offer.proposedBudget} zł` : ''}
              </div>
            </div>
            <span className="badge">{OFFER_STATUS_LABELS[offer.status] ?? offer.status}</span>
          </div>
        ))
      )}
    </main>
  );
}

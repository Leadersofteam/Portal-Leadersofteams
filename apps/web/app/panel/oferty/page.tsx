import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmActionButton } from '@/components/action-button';
import { OFFER_STATUS_LABELS, ORDER_STATUS_LABELS } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

interface MyOffer {
  id: string;
  status: string;
  proposedBudget: number | null;
  messagesCount: number;
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
          <div key={offer.id} className="list-row list-row--stack">
            <div>
              <h3>
                <Link href={`/zlecenia/${offer.order.id}`}>{offer.order.title}</Link>
              </h3>
              <div className="meta">
                Zlecenie: {ORDER_STATUS_LABELS[offer.order.status] ?? offer.order.status}
                {offer.proposedBudget ? ` · Twoja propozycja: ${offer.proposedBudget} zł` : ''}
              </div>
            </div>
            <div className="list-row-aside">
              <span className="badge">{OFFER_STATUS_LABELS[offer.status] ?? offer.status}</span>
              {/* Wątek przy ofercie (PL1) — tu Lider dowiaduje się, czy Firma
                  dopytała, zanim wybrała. */}
              <Link className="btn secondary" href={`/oferty/${offer.id}`}>
                Rozmowa{offer.messagesCount > 0 ? ` (${offer.messagesCount})` : ''} →
              </Link>
              {/* ZASTANY BRAK znaleziony przez strażnika kontraktu w S18:
                  `POST /offers/:id/withdraw` istniał od Sprintu 3 i nie miał
                  ŻADNEGO wejścia w interfejsie — złożonej oferty nie dało się
                  wycofać inaczej niż curl-em. Widoczny tylko dla ofert
                  złożonych, bo serwis przepuszcza wyłącznie status SUBMITTED. */}
              {offer.status === 'SUBMITTED' && (
                <ConfirmActionButton
                  path={`/offers/${offer.id}/withdraw`}
                  label="Wycofaj ofertę"
                  confirmLabel="Tak, wycofaj"
                  question="Do tego zlecenia nie złożysz już drugiej oferty."
                />
              )}
            </div>
          </div>
        ))
      )}
    </main>
  );
}

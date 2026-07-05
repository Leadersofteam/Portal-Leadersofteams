import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ORDER_STATUS_LABELS, OFFER_STATUS_LABELS, formatBudget } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { ActionButton, OfferForm } from './actions';

interface OrderDetail {
  order: {
    id: string;
    title: string;
    description: string;
    industry: { name: string };
    budgetMin: number;
    budgetMax: number;
    minLevel: number;
    status: string;
    companyName: string;
  };
  viewer: {
    isCompanyMember: boolean;
    isAwardedLeader: boolean;
    myOffer: { id: string; status: string } | null;
  };
}

interface OfferRow {
  id: string;
  message: string;
  proposedBudget: number | null;
  proposedDays: number | null;
  status: string;
  leader: { profileId: string; displayName: string; headline: string; industry: string };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<OrderDetail>(`/orders/${id}`);
  if (!data) notFound();
  const { order, viewer } = data;

  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  const isLoggedIn = Boolean(me?.user);

  const offers =
    viewer.isCompanyMember && ['PUBLISHED', 'AWARDED'].includes(order.status)
      ? ((await serverApi<{ offers: OfferRow[] }>(`/orders/${id}/offers`))?.offers ?? [])
      : [];

  const canOffer =
    isLoggedIn && !viewer.isCompanyMember && order.status === 'PUBLISHED' && !viewer.myOffer;

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/zlecenia">← Wszystkie zlecenia</Link>
      </div>
      <h1>{order.title}</h1>
      <p className="meta muted">
        {order.companyName} · {order.industry.name} ·{' '}
        <span className="badge">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>{' '}
        {order.minLevel > 0 && (
          <span className="badge accent">wymagany poziom {order.minLevel}+</span>
        )}
      </p>
      <p>
        <strong>Budżet:</strong> {formatBudget(order.budgetMin, order.budgetMax)}
      </p>
      <p className="description">{order.description}</p>

      {/* --- akcje Firmy --- */}
      {viewer.isCompanyMember && (
        <div className="actions-row">
          {order.status === 'DRAFT' && (
            <ActionButton path={`/orders/${order.id}/publish`} label="Opublikuj zlecenie" />
          )}
          {['DRAFT', 'PUBLISHED', 'AWARDED'].includes(order.status) && (
            <ActionButton path={`/orders/${order.id}/cancel`} label="Anuluj" variant="secondary" />
          )}
          {order.status === 'DELIVERED' && (
            <ActionButton path={`/orders/${order.id}/confirm`} label="Potwierdź wykonanie" />
          )}
          {['IN_PROGRESS', 'DELIVERED'].includes(order.status) && (
            <ActionButton
              path={`/orders/${order.id}/dispute`}
              label="Zgłoś spór"
              variant="secondary"
            />
          )}
        </div>
      )}

      {/* --- oferty (widok Firmy) --- */}
      {viewer.isCompanyMember && offers.length > 0 && (
        <section>
          <h2>Oferty ({offers.length})</h2>
          {offers.map((offer) => (
            <div key={offer.id} className="card" style={{ marginBottom: '1rem' }}>
              <h3>
                <Link href={`/liderzy/${offer.leader.profileId}`}>{offer.leader.displayName}</Link>{' '}
                <span className="badge">{OFFER_STATUS_LABELS[offer.status] ?? offer.status}</span>
              </h3>
              <p className="muted">{offer.leader.headline}</p>
              <p className="description">{offer.message}</p>
              <p className="muted">
                {offer.proposedBudget ? `Proponowany budżet: ${offer.proposedBudget} zł. ` : ''}
                {offer.proposedDays ? `Czas: ${offer.proposedDays} dni.` : ''}
              </p>
              {order.status === 'PUBLISHED' && offer.status === 'SUBMITTED' && (
                <ActionButton path={`/offers/${offer.id}/accept`} label="Wybierz tę ofertę" />
              )}
            </div>
          ))}
        </section>
      )}

      {/* --- akcje Lidera --- */}
      {viewer.isAwardedLeader && (
        <div className="actions-row">
          {order.status === 'AWARDED' && (
            <ActionButton path={`/orders/${order.id}/start`} label="Rozpocznij pracę" />
          )}
          {order.status === 'IN_PROGRESS' && (
            <ActionButton path={`/orders/${order.id}/deliver`} label="Oddaj pracę" />
          )}
          {['IN_PROGRESS', 'DELIVERED'].includes(order.status) && (
            <ActionButton
              path={`/orders/${order.id}/dispute`}
              label="Zgłoś spór"
              variant="secondary"
            />
          )}
        </div>
      )}

      {viewer.myOffer && (
        <p className="muted">
          Twoja oferta: <span className="badge">{OFFER_STATUS_LABELS[viewer.myOffer.status]}</span>
        </p>
      )}

      {canOffer && <OfferForm orderId={order.id} />}

      {!isLoggedIn && order.status === 'PUBLISHED' && (
        <p>
          <Link href="/logowanie">Zaloguj się</Link>, aby złożyć ofertę.
        </p>
      )}
    </main>
  );
}

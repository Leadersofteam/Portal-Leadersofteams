import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { JsonLd } from '@/components/json-ld';
import { ReportButton } from '@/components/report-button';
import { orderJsonLd } from '@/lib/jsonld';
import { ORDER_STATUS_LABELS, OFFER_STATUS_LABELS, formatBudget } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { ActionButton, OfferForm } from './actions';
import { ReviewForm } from './review-form';

interface ReviewsData {
  reviews: Array<{
    id: string;
    direction: string;
    rating: number;
    comment: string | null;
    authorName: string;
  }>;
  myReview: { id: string; published: boolean } | null;
}

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
    companyId: string;
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
  messagesCount: number;
  leader: { profileId: string; displayName: string; headline: string; industry: string };
}

const messagesLabel = (n: number) =>
  n === 0 ? 'Zapytaj Lidera' : n === 1 ? '1 wiadomość' : `${n} wiadomości`;

const getOrder = cache((id: string) => serverApi<OrderDetail>(`/orders/${id}`));

const clip = (s: string, n = 155) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getOrder(id);
  if (!data) return { title: 'Zlecenie nie znalezione' };
  const { order } = data;
  const title = `${order.title} — zlecenie ${order.industry.name} | Leaders of Teams`;
  const description = clip(
    `${order.companyName} · budżet ${order.budgetMin}–${order.budgetMax} zł. ${order.description}`,
  );
  return {
    title,
    description,
    alternates: { canonical: `/zlecenia/${id}` },
    openGraph: { type: 'article', title, description, url: `/zlecenia/${id}` },
  };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOrder(id);
  if (!data) notFound();
  const { order, viewer } = data;

  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  const isLoggedIn = Boolean(me?.user);
  // Stan potwierdzenia adresu tylko tam, gdzie ma znaczenie (szkic Firmy) —
  // jedno zapytanie więcej wyłącznie dla właściciela szkicu.
  const verification =
    viewer.isCompanyMember && order.status === 'DRAFT'
      ? await serverApi<{ email: string; verified: boolean }>('/me/verification')
      : null;

  const offers =
    viewer.isCompanyMember && ['PUBLISHED', 'AWARDED'].includes(order.status)
      ? ((await serverApi<{ offers: OfferRow[] }>(`/orders/${id}/offers`))?.offers ?? [])
      : [];

  const canOffer =
    isLoggedIn && !viewer.isCompanyMember && order.status === 'PUBLISHED' && !viewer.myOffer;

  const reviewsData =
    order.status === 'CONFIRMED' ? await serverApi<ReviewsData>(`/orders/${id}/reviews`) : null;
  const isParticipant = viewer.isCompanyMember || viewer.isAwardedLeader;
  const canReview = order.status === 'CONFIRMED' && isParticipant && !reviewsData?.myReview;

  return (
    <main>
      {order.status === 'PUBLISHED' && (
        <JsonLd
          data={orderJsonLd({
            id: order.id,
            title: order.title,
            description: order.description,
            industryName: order.industry.name,
            budgetMin: order.budgetMin,
            budgetMax: order.budgetMax,
            companyName: order.companyName,
            publishedAt: null,
          })}
        />
      )}
      <div className="breadcrumbs">
        <Link href="/zlecenia">← Wszystkie zlecenia</Link>
      </div>
      <h1>{order.title}</h1>
      <p className="meta muted">
        {/* Nazwa firmy jest LINKIEM do jej profilu. Bez tego Lider czytający
            zlecenie widział samą nazwę i decydował w ciemno, czy warto poświęcić
            godziny na ofertę — to był powód powstania /firmy/[id]. */}
        <Link href={`/firmy/${order.companyId}`}>{order.companyName}</Link> · {order.industry.name}{' '}
        · <span className="badge">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>{' '}
        {order.minLevel > 0 && (
          <span className="badge accent">wymagany poziom {order.minLevel}+</span>
        )}
      </p>
      <p>
        <strong>Budżet:</strong> {formatBudget(order.budgetMin, order.budgetMax)}
      </p>
      <p className="description">{order.description}</p>

      {isLoggedIn && !viewer.isCompanyMember && (
        <div className="actions-row">
          <ReportButton subjectType="ORDER" subjectId={order.id} />
        </div>
      )}

      {/* PL2 (D2): szkic gościa publikuje się dopiero po potwierdzeniu adresu.
          Mówimy to PRZED kliknięciem, nie dopiero błędem z API — a link do
          ponownej wysyłki jest w banerze panelu. */}
      {viewer.isCompanyMember && order.status === 'DRAFT' && verification?.verified === false && (
        <div className="card" data-testid="verify-before-publish">
          <h3>Potwierdź adres e-mail, żeby opublikować</h3>
          <p className="muted">
            Link wysłaliśmy na {verification.email}. Nie dotarł?{' '}
            <Link href="/panel">Wyślij ponownie z panelu →</Link> Szkic czeka tutaj.
          </p>
        </div>
      )}

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
            <div key={offer.id} className="card offer-card">
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
              <div className="actions-row">
                {order.status === 'PUBLISHED' && offer.status === 'SUBMITTED' && (
                  <ActionButton path={`/offers/${offer.id}/accept`} label="Wybierz tę ofertę" />
                )}
                {/* Wątek przy ofercie (PL1): Firma może dopytać, zanim wybierze —
                    do 04.09 miała tylko „wybierz albo zignoruj". */}
                <Link className="btn secondary" href={`/oferty/${offer.id}`}>
                  {messagesLabel(offer.messagesCount)} →
                </Link>
              </div>
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
          Twoja oferta: <span className="badge">{OFFER_STATUS_LABELS[viewer.myOffer.status]}</span>{' '}
          · <Link href={`/oferty/${viewer.myOffer.id}`}>Rozmowa z firmą →</Link>
        </p>
      )}

      {canOffer && <OfferForm orderId={order.id} />}

      {/* --- oceny po zakończeniu --- */}
      {reviewsData && reviewsData.reviews.length > 0 && (
        <section>
          <h2>Oceny</h2>
          {reviewsData.reviews.map((review) => (
            <div key={review.id} className="card" style={{ marginBottom: '1rem' }}>
              <h3>
                {review.authorName} <span className="badge accent">{review.rating}/5</span>{' '}
                <span className="badge">
                  {review.direction === 'COMPANY_TO_LEADER' ? 'ocena Lidera' : 'ocena Firmy'}
                </span>
              </h3>
              {review.comment && <p className="description">{review.comment}</p>}
            </div>
          ))}
        </section>
      )}
      {reviewsData?.myReview && !reviewsData.myReview.published && (
        <p className="muted">
          Twoja ocena czeka na ocenę drugiej strony (publikacja symultaniczna — maks. 14 dni).
        </p>
      )}
      {canReview && <ReviewForm orderId={order.id} />}

      {!isLoggedIn && order.status === 'PUBLISHED' && (
        <p>
          <Link href="/logowanie">Zaloguj się</Link>, aby złożyć ofertę.
        </p>
      )}
    </main>
  );
}

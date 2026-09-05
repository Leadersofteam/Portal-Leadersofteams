import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { OFFER_STATUS_LABELS, ORDER_STATUS_LABELS, formatBudget } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { OfferReplyForm } from './reply-form';

export const metadata = { title: 'Rozmowa o ofercie — Leaders of Teams' };

// Wątek przy ofercie (PL1). Do 04.09 Firma mogła ofertę tylko przyjąć albo
// zignorować — przy usługach kanał rozmowy istniał (/zapytania/[id]), przy
// zleceniach nie. Ta strona jest lustrem strony zapytania: oferta na górze
// jako kontekst, pod nią rozmowa, pod rozmową odpowiedź. To NIE jest
// komunikator (ADR-010): bez oferty nie ma wątku, a po jej wycofaniu
// wątek zostaje tylko do odczytu.
interface OfferThread {
  thread: {
    offer: {
      id: string;
      status: string;
      message: string;
      proposedBudget: number | null;
      proposedDays: number | null;
      createdAt: string;
    };
    order: {
      id: string;
      title: string;
      status: string;
      budgetMin: number;
      budgetMax: number;
      industryName: string;
      companyId: string;
      companyName: string;
    };
    leader: { profileId: string; displayName: string };
    viewer: { isLeader: boolean; isCompany: boolean };
    canReply: boolean;
    messages: Array<{
      id: string;
      body: string;
      createdAt: string;
      authorName: string;
      isOwn: boolean;
    }>;
  };
}

export default async function OfferThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const data = await serverApi<OfferThread>(`/offers/${id}/messages`);
  if (!data) notFound();
  const { offer, order, leader, viewer, canReply, messages } = data.thread;
  // `?wyslana=1` — wejście prosto po złożeniu oferty. Ekran „Twoja oferta
  // czeka" (zgłoszenie z dziennika wyprawy, dzień 6): Lider ma wiedzieć,
  // co się właśnie stało i gdzie to śledzić, bez zgadywania.
  const justSent = query.wyslana === '1' && viewer.isLeader;

  return (
    <main>
      <div className="breadcrumbs">
        <Link href={`/zlecenia/${order.id}`}>← Zlecenie: {order.title}</Link>
      </div>
      <h1>Rozmowa o ofercie</h1>

      {justSent && (
        <div className="card" data-testid="offer-sent">
          <h3>Twoja oferta czeka na Firmę</h3>
          <p className="muted">
            Firma {order.companyName} dostała powiadomienie i e-mail. Gdy odpowie albo wybierze
            Twoją ofertę, dowiesz się tak samo. Możesz tu dopisać, jeśli chcesz coś doprecyzować.{' '}
            <Link href="/panel/oferty">Wszystkie Twoje oferty →</Link>
          </p>
        </div>
      )}

      <div className="card offer-card">
        <p className="meta muted">
          {viewer.isCompany ? (
            <Link href={`/liderzy/${leader.profileId}`}>{leader.displayName}</Link>
          ) : (
            <Link href={`/firmy/${order.companyId}`}>{order.companyName}</Link>
          )}{' '}
          · {order.industryName} ·{' '}
          <span className="badge">{OFFER_STATUS_LABELS[offer.status] ?? offer.status}</span>{' '}
          <span className="badge">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
        </p>
        <p className="description">{offer.message}</p>
        <p className="muted">
          Budżet zlecenia: {formatBudget(order.budgetMin, order.budgetMax)}.
          {offer.proposedBudget ? ` Propozycja: ${offer.proposedBudget} zł.` : ''}
          {offer.proposedDays ? ` Czas: ${offer.proposedDays} dni.` : ''}
        </p>
      </div>

      <h2>Rozmowa</h2>
      {messages.length === 0 ? (
        <p className="muted">
          {canReply
            ? viewer.isCompany
              ? 'Jeszcze nic tu nie ma. Dopytaj o zakres, termin albo cenę — Lider dostanie powiadomienie i e-mail.'
              : 'Jeszcze nic tu nie ma. Firma może tu dopytać — a Ty doprecyzować ofertę.'
            : 'Ta rozmowa nie zaczęła się i jest już zamknięta.'}
        </p>
      ) : (
        <div className="message-thread">
          {messages.map((message) => (
            <div key={message.id} className={message.isOwn ? 'message own' : 'message'}>
              <div className="meta">
                {message.authorName} · {new Date(message.createdAt).toLocaleString('pl-PL')}
              </div>
              <div className="pre-wrap">{message.body}</div>
            </div>
          ))}
        </div>
      )}

      {canReply ? (
        <OfferReplyForm offerId={offer.id} />
      ) : (
        <p className="muted">
          Rozmowa jest zamknięta — oferta nie jest już aktywna albo zlecenie zostało anulowane.
        </p>
      )}
    </main>
  );
}

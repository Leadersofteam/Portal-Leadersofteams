import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Info } from '@/components/v17/formy';
import { Komunikat } from '@/components/v17/karty';
import { Rama, Stopka } from '@/components/v17/rama';
import { RozmowaBezPunktow, Wiadomosc, kiedyWiadomosc } from '@/components/v17/reszta-watki';
import { OdpowiedzForm } from '@/components/v17/reszta-watki-formy';
import { Wstecz, zl } from '@/components/v17/rynek';
import { Aw, Odznaka } from '@/components/v17/znaki';
import { OFFER_STATUS_LABELS, ORDER_STATUS_LABELS } from '@/lib/labels';
import { serverApiStatus } from '@/lib/server-api';
import { nf4, plural, temu } from '@/lib/v17';
import { loadJa } from '@/lib/v17-data';

export const metadata = { title: 'Rozmowa o ofercie — Leaders of Teams' };

// Wątek przy ofercie to NIE komunikator (ADR-010): bez oferty nie ma wątku,
// a po jej zamknięciu zostaje tylko do odczytu.
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
    leader: { profileId: string; displayName: string; level: number };
    viewer: { isLeader: boolean; isCompany: boolean };
    canReply: boolean;
    messages: Array<{
      id: string;
      body: string;
      createdAt: string;
      authorName: string;
      isOwn: boolean;
      fromLeader: boolean;
    }>;
  };
}

export default async function OfertaV17({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const ja = await loadJa();
  if (!ja) redirect('/logowanie');

  const r = await serverApiStatus<OfferThread>(`/offers/${id}/messages`);
  // 403 jak dziś: osoba spoza rozmowy dostaje „nie znaleziono”, nie potwierdzenie, że wątek istnieje.
  if (r.status === 404 || r.status === 403) notFound();
  if (!r.data) throw new Error(`Wątek oferty ${id}: API zwróciło ${r.status}`);
  const { offer, order, leader, viewer, canReply, messages } = r.data.thread;
  const lider = !viewer.isCompany;
  // `?wyslana=1` — wejście prosto po złożeniu oferty: Lider ma wiedzieć, co się stało i gdzie to śledzić.
  const justSent = query.wyslana === '1' && viewer.isLeader;
  const budzet =
    order.budgetMin === order.budgetMax
      ? zl(order.budgetMin)
      : `${nf4(order.budgetMin)}–${zl(order.budgetMax)}`;

  return (
    <Rama
      aktywny="zlecenia"
      szeroka
      reszta
      ja={{
        name: ja.displayName,
        level: ja.level,
        handle: ja.handle,
        avatarFileId: ja.avatarFileId,
        firma: viewer.isCompany
          ? { nazwa: order.companyName, branza: order.industryName }
          : undefined,
      }}
    >
      <div className="wt">
        <div className="gl">
          <Wstecz href={`/zlecenia/${order.id}`}>Zlecenie: {order.title}</Wstecz>
          <h1 className="st-h1" style={{ fontSize: 30 }}>
            Rozmowa o ofercie
          </h1>
          {justSent ? (
            <div data-testid="offer-sent">
              <Info
                ikona="check-circle"
                rodzaj="ok"
                akcje={
                  <Link className="vbtn obrys maly" href="/panel/oferty">
                    Wszystkie Twoje oferty
                  </Link>
                }
              >
                <b>Twoja oferta czeka na firmę.</b> {order.companyName} dostała powiadomienie i
                e-mail. Gdy odpowie albo wybierze Twoją ofertę, dowiesz się tak samo. Możesz tu
                dopisać, jeśli chcesz coś doprecyzować.
              </Info>
            </div>
          ) : null}
        </div>

        <aside aria-label="Oferta i zlecenie">
          <section className="fm-karta">
            <h2>{lider ? 'Firma zlecająca' : 'Oferent'}</h2>
            {lider ? (
              <Link className="kto-k" href={`/firmy/${order.companyId}`}>
                <Aw name={order.companyName} size={44} company industry={order.industryName} />
                <span>
                  <b>{order.companyName}</b>
                  <small>Profil firmy</small>
                </span>
              </Link>
            ) : (
              <Link className="kto-k" href={`/liderzy/${leader.profileId}`}>
                <Aw name={leader.displayName} size={44} />
                <span>
                  <b>{leader.displayName}</b>
                  <small>
                    <Odznaka level={leader.level} />
                  </small>
                </span>
              </Link>
            )}
          </section>
          <section className="fm-karta">
            <h2>Oferta</h2>
            <dl className="rn-dl">
              {offer.proposedBudget ? (
                <div>
                  <dt>Propozycja</dt>
                  <dd>{zl(offer.proposedBudget)}</dd>
                </div>
              ) : null}
              {offer.proposedDays ? (
                <div>
                  <dt>Czas</dt>
                  <dd>
                    {offer.proposedDays} {plural(offer.proposedDays, 'dzień', 'dni', 'dni')}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Budżet zlecenia</dt>
                <dd>{budzet}</dd>
              </div>
              <div>
                <dt>Branża</dt>
                <dd>{order.industryName}</dd>
              </div>
              <div>
                <dt>Status oferty</dt>
                <dd>{OFFER_STATUS_LABELS[offer.status] ?? offer.status}</dd>
              </div>
              <div>
                <dt>Status zlecenia</dt>
                <dd>{ORDER_STATUS_LABELS[order.status] ?? order.status}</dd>
              </div>
            </dl>
            {/* Wybierać można tylko, póki zlecenie zbiera oferty. */}
            {!lider && order.status === 'PUBLISHED' && offer.status === 'SUBMITTED' ? (
              <Link className="vbtn obrys" href={`/zlecenia/${order.id}`}>
                Porównaj i wybierz na stronie zlecenia
              </Link>
            ) : null}
          </section>
        </aside>

        <div className="tr">
          <ol className="msgs" style={{ borderBottom: 0 }} aria-label="Treść oferty">
            <Wiadomosc
              autor={leader.displayName}
              kiedy={`złożona ${temu(offer.createdAt)}`}
              ja={viewer.isLeader}
            >
              {offer.message}
            </Wiadomosc>
          </ol>
          <h2
            style={{
              margin: '24px 0 0',
              font: '800 20px/1.2 var(--font-display)',
              letterSpacing: '-.02em',
              color: 'var(--text-strong)',
            }}
          >
            Rozmowa
          </h2>
          {messages.length ? (
            <ol className="msgs" aria-label="Wiadomości">
              {messages.map((m) => (
                <Wiadomosc
                  key={m.id}
                  autor={m.fromLeader ? leader.displayName : order.companyName}
                  firma={!m.fromLeader}
                  kiedy={kiedyWiadomosc(m.createdAt)}
                  ja={m.isOwn}
                >
                  {m.body}
                </Wiadomosc>
              ))}
            </ol>
          ) : (
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 22 }}>
              <Komunikat
                ikona="chats-circle"
                tytul="Jeszcze nic tu nie ma"
                opis={
                  !canReply
                    ? 'Ta rozmowa nie zaczęła się i jest już zamknięta.'
                    : lider
                      ? 'Firma może tu dopytać — a Ty doprecyzować ofertę.'
                      : 'Dopytaj o zakres, termin albo cenę — Lider dostanie powiadomienie i e-mail.'
                }
              />
            </div>
          )}
          {canReply ? (
            <OdpowiedzForm
              sciezka={`/offers/${offer.id}/messages`}
              etykieta="Wiadomość"
              podpowiedz={
                lider ? 'Dopisz, co chcesz doprecyzować' : 'Dopytaj o zakres, termin albo cenę'
              }
            />
          ) : (
            <Info ikona="lock-simple">
              <b>Rozmowa jest zamknięta</b> — oferta nie jest już aktywna albo zlecenie zostało
              anulowane.
            </Info>
          )}
          <RozmowaBezPunktow />
        </div>
      </div>
      <div className="rn-stopka">
        <Stopka />
      </div>
    </Rama>
  );
}

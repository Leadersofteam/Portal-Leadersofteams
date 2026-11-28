import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { ActionButton, OfferForm, ResendVerificationButton } from '@/app/zlecenia/[id]/actions';
import { ReviewForm } from '@/app/zlecenia/[id]/review-form';
import { JsonLd } from '@/components/json-ld';
import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { FiltrAuto } from '@/components/v17/filtr-auto';
import { OfertyPorownanie } from '@/components/v17/oferty-porownanie';
import type { OfertaWiersz } from '@/components/v17/oferty-porownanie';
import { Rama, Stopka } from '@/components/v17/rama';
import { Wstecz } from '@/components/v17/rynek';
import { Udostepnij } from '@/components/v17/udostepnij';
import { Aw } from '@/components/v17/znaki';
import { ReportButton } from '@/components/report-button';
import { orderJsonLd } from '@/lib/jsonld';
import { OFFER_STATUS_LABELS, ORDER_STATUS_LABELS } from '@/lib/labels';
import type { LevelRule } from '@/lib/levels';
import { serverApi, serverApiStatus } from '@/lib/server-api';
import { budget, dodaneGodz, levelsOrFallback, nf4, plural, temu } from '@/lib/v17';
import { loadJa, loadSwiatlo } from '@/lib/v17-data';

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
    publishedAt: string | null;
    companyId: string;
    companyName: string;
    companyVerified?: boolean;
    companyOrdersCount?: number;
    offersCount?: number;
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
  createdAt: string;
  messagesCount: number;
  leader: {
    profileId: string;
    handle?: string | null;
    displayName: string;
    headline: string;
    industry: string;
  };
}

const messagesLabel = (n: number) =>
  n === 0 ? 'Zapytaj Lidera' : n === 1 ? '1 wiadomość' : `${n} wiadomości`;

// 404 → notFound(); każda inna porażka API → błąd ekranu (error.tsx), a nie fałszywe „nie znaleziono”.
const getOrder = cache(async (id: string) => {
  const r = await serverApiStatus<OrderDetail>(`/orders/${id}`);
  if (r.status === 404) return null;
  if (!r.data) throw new Error(`Zlecenie ${id}: API zwróciło ${r.status}`);
  return r.data;
});

const clip = (s: string, n = 155) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getOrder(id).catch(() => null);
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
    // Obrazek z PUBLICZNEJ trasy starego widoku: rewrite do /v17 go gubi, a /v17/* jest zamknięte dla robotów.
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/zlecenia/${id}`,
      images: [`/zlecenia/${id}/opengraph-image`],
    },
  };
}

export default async function ZlecenieV17({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await getOrder(id);
  if (!data) notFound();
  const { order, viewer } = data;
  const kolejnosc = sp.kolejnosc === 'cena' || sp.kolejnosc === 'termin' ? sp.kolejnosc : 'nowe';

  const ja = await loadJa();
  const isLoggedIn = Boolean(ja);
  const verification =
    viewer.isCompanyMember && order.status === 'DRAFT'
      ? await serverApi<{ email: string; verified: boolean; publishGate?: boolean }>(
          '/me/verification',
        )
      : null;
  const publishLocked = verification?.verified === false && verification.publishGate !== false;

  const offers =
    viewer.isCompanyMember && ['PUBLISHED', 'AWARDED'].includes(order.status)
      ? ((await serverApi<{ offers: OfferRow[] }>(`/orders/${id}/offers`))?.offers ?? [])
      : [];
  // Poziom i oceny oferenta: lista ofert ich nie niesie, a to one odróżniają ofertę od oferty (Drabinka + oceny po zleceniach).
  const [profile, swiatla, levels] = await Promise.all([
    Promise.all(
      offers.map((o) =>
        serverApi<{
          profile: { level: number; averageRating: number | null; reviewCount: number };
        }>(`/leaders/${o.leader.profileId}`),
      ),
    ),
    // Punkty oferenta z PUBLICZNEJ Osi światła (to samo źródło co profil), gdy ma handle.
    Promise.all(offers.map((o) => (o.leader.handle ? loadSwiatlo(o.leader.handle, 1) : null))),
    offers.length ? serverApi<{ levels: LevelRule[] }>('/ladder/levels') : null,
  ]);
  const rules = levelsOrFallback(levels?.levels);
  const wiersze: OfertaWiersz[] = offers.map((o, i) => ({
    id: o.id,
    status: o.status,
    statusEtykieta: OFFER_STATUS_LABELS[o.status] ?? o.status,
    profileId: o.leader.profileId,
    nazwa: o.leader.displayName,
    branza: o.leader.industry,
    kiedy: temu(o.createdAt),
    wiadomosc: o.message,
    cena: o.proposedBudget,
    dni: o.proposedDays,
    poziom: swiatla[i]?.summary.level ?? profile[i]?.profile.level ?? 0,
    punkty: swiatla[i]?.summary.totalPoints ?? null,
    srednia: profile[i]?.profile.averageRating ?? null,
    liczbaOcen: profile[i]?.profile.reviewCount ?? 0,
    wiadomosci: messagesLabel(o.messagesCount),
  }));
  const kolejne = [...wiersze].sort((a, b) =>
    kolejnosc === 'cena'
      ? (a.cena ?? Infinity) - (b.cena ?? Infinity)
      : kolejnosc === 'termin'
        ? (a.dni ?? Infinity) - (b.dni ?? Infinity)
        : 0,
  );
  // API zwraca od najstarszej; „od najnowszej” to odwrócenie.
  const oferty = kolejnosc === 'nowe' ? kolejne.reverse() : kolejne;

  const canOffer =
    isLoggedIn && !viewer.isCompanyMember && order.status === 'PUBLISHED' && !viewer.myOffer;
  const reviewsData =
    order.status === 'CONFIRMED' ? await serverApi<ReviewsData>(`/orders/${id}/reviews`) : null;
  const isParticipant = viewer.isCompanyMember || viewer.isAwardedLeader;
  const canReview = order.status === 'CONFIRMED' && isParticipant && !reviewsData?.myReview;
  const wymog = order.minLevel > 0 ? rules[order.minLevel - 1] : undefined;
  const dodane = order.publishedAt ? dodaneGodz(order.publishedAt) : null;

  return (
    <Rama
      aktywny="zlecenia"
      szeroka
      ja={
        ja
          ? {
              name: ja.displayName,
              level: ja.level,
              handle: ja.handle,
              avatarFileId: ja.avatarFileId,
              // Widok firmy (makieta): rama pokazuje firmę, w imieniu której ktoś porównuje oferty.
              firma: viewer.isCompanyMember
                ? { nazwa: order.companyName, branza: order.industry.name }
                : undefined,
            }
          : null
      }
    >
      <div className="rn-det">
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
        <Wstecz href="/zlecenia">Zlecenia</Wstecz>
        <div className="nad">
          {viewer.isCompanyMember ? 'Twoje zlecenie · ' : ''}
          {order.industry.name}
          {dodane ? ` · dodane ${dodane}` : ''}
        </div>
        <h1>{order.title}</h1>
        <div className="rn-head-row">
          <div className="rn-firma">
            <Aw name={order.companyName} size={40} company industry={order.industry.name} />
            <div>
              {/* Nazwa firmy jest LINKIEM do jej profilu (/firmy/[id]) — Lider decyduje, czy warto składać ofertę. */}
              <b>
                <Link href={`/firmy/${order.companyId}`}>{order.companyName}</Link>
              </b>
              <small className={order.companyVerified ? undefined : 'brak'}>
                <Ico n={order.companyVerified ? 'seal-check' : 'question'} />
                {order.companyVerified ? 'NIP — suma kontrolna OK' : 'Firma bez potwierdzonego NIP'}
                {order.companyOrdersCount
                  ? ` · ${order.companyOrdersCount} ${plural(order.companyOrdersCount, 'zlecenie', 'zlecenia', 'zleceń')}`
                  : ''}
              </small>
            </div>
          </div>
          {viewer.isCompanyMember ? (
            <div className="rn-akcje-wl">
              {order.status === 'DRAFT' && publishLocked && (
                <span className="publish-locked">
                  <button
                    type="button"
                    className="vbtn glowny"
                    disabled
                    aria-describedby="publish-locked-why"
                  >
                    Opublikuj zlecenie
                  </button>
                  <span id="publish-locked-why" className="muted">
                    Dostępne po potwierdzeniu adresu e-mail.
                  </span>
                </span>
              )}
              {order.status === 'DRAFT' && !publishLocked && (
                <ActionButton
                  path={`/orders/${order.id}/publish`}
                  label="Opublikuj zlecenie"
                  className="vbtn glowny"
                />
              )}
              {['DRAFT', 'PUBLISHED', 'AWARDED'].includes(order.status) && (
                <ActionButton
                  path={`/orders/${order.id}/cancel`}
                  label="Anuluj zlecenie"
                  className="vbtn obrys"
                />
              )}
              {order.status === 'DELIVERED' && (
                <ActionButton
                  path={`/orders/${order.id}/confirm`}
                  label="Potwierdź wykonanie"
                  className="vbtn glowny"
                />
              )}
              {['IN_PROGRESS', 'DELIVERED'].includes(order.status) && (
                <ActionButton
                  path={`/orders/${order.id}/dispute`}
                  label="Zgłoś spór"
                  className="vbtn obrys"
                />
              )}
            </div>
          ) : null}
        </div>

        <div className="rn-2">
          <div className="rn-opis">
            {order.description.split(/\n{2,}/).map((p, i) => (
              <p key={i} style={{ whiteSpace: 'pre-wrap' }}>
                {p}
              </p>
            ))}
          </div>
          <dl className="rn-dl">
            <div>
              <dt>Budżet</dt>
              <dd>{budget(order.budgetMin, order.budgetMax, nf4)}</dd>
            </div>
            <div>
              <dt>Branża</dt>
              <dd>{order.industry.name}</dd>
            </div>
            <div>
              <dt>Poziom oferenta</dt>
              <dd>{wymog ? `od L${order.minLevel} · ${wymog.name}` : 'bez wymagań'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{ORDER_STATUS_LABELS[order.status] ?? order.status}</dd>
            </div>
          </dl>
        </div>

        {isLoggedIn && !viewer.isCompanyMember ? (
          <div className="rn-akcje">
            <ReportButton subjectType="ORDER" subjectId={order.id} />
          </div>
        ) : null}

        {/* PL2 (D2): szkic gościa publikuje się dopiero po potwierdzeniu adresu — mówimy to PRZED kliknięciem. */}
        {viewer.isCompanyMember && order.status === 'DRAFT' && verification?.verified === false ? (
          <div className="rn-akcje card" data-testid="verify-before-publish">
            <h3>Potwierdź adres e-mail, żeby opublikować</h3>
            <p className="muted">
              Link wysłaliśmy na {verification.email}. Kliknij go w poczcie i wróć tutaj — szkic
              czeka. Nie dotarł? Wyślemy nowy.
            </p>
            <ResendVerificationButton email={verification.email} />
          </div>
        ) : null}

        {viewer.isAwardedLeader ? (
          <div className="rn-akcje">
            {order.status === 'AWARDED' && (
              <ActionButton
                path={`/orders/${order.id}/start`}
                label="Rozpocznij pracę"
                className="vbtn glowny"
              />
            )}
            {order.status === 'IN_PROGRESS' && (
              <ActionButton
                path={`/orders/${order.id}/deliver`}
                label="Oddaj pracę"
                className="vbtn glowny"
              />
            )}
            {['IN_PROGRESS', 'DELIVERED'].includes(order.status) && (
              <ActionButton
                path={`/orders/${order.id}/dispute`}
                label="Zgłoś spór"
                className="vbtn obrys"
              />
            )}
          </div>
        ) : null}

        {/* Porównanie ofert obok siebie (Oferteo) widzi wyłącznie Firma — API nie ujawnia treści ofert reszcie.
            Reszta widzi w tym miejscu sam licznik (fakt zlecenia) i drogę do porównania. */}
        {['PUBLISHED', 'AWARDED'].includes(order.status) ? (
          <section className="rn-oferty" aria-labelledby="of-h">
            <header>
              <h2 id="of-h">
                Oferty
                {viewer.isCompanyMember && oferty.length ? (
                  <small>
                    {oferty.length} ·{' '}
                    {kolejnosc === 'nowe'
                      ? 'od najnowszej'
                      : kolejnosc === 'cena'
                        ? 'cena rosnąco'
                        : 'termin rosnąco'}
                  </small>
                ) : null}
              </h2>
              {viewer.isCompanyMember && oferty.length > 1 ? (
                <FiltrAuto label="Kolejność ofert">
                  <select
                    className="rn-sel"
                    name="kolejnosc"
                    aria-label="Kolejność ofert"
                    defaultValue={kolejnosc}
                  >
                    <option value="nowe">Od najnowszej</option>
                    <option value="cena">Cena rosnąco</option>
                    <option value="termin">Termin rosnąco</option>
                  </select>
                </FiltrAuto>
              ) : null}
            </header>
            {!viewer.isCompanyMember ? (
              <Komunikat
                ikona="lock-simple"
                tytul={
                  (order.offersCount ?? 0) > 0
                    ? `Złożono ${order.offersCount} ${plural(order.offersCount ?? 0, 'ofertę', 'oferty', 'ofert')}`
                    : 'Jeszcze nie złożono ofert'
                }
                opis={
                  isLoggedIn
                    ? 'Treść ofert widzi tylko firma, która zleciła pracę — porównuje je cena, termin i poziom w Drabince.'
                    : order.status === 'PUBLISHED'
                      ? 'Zaloguj się, aby złożyć ofertę. Jeśli to zlecenie Twojej firmy, po zalogowaniu porównasz tu oferty.'
                      : 'Jeśli to zlecenie Twojej firmy, zaloguj się, żeby zobaczyć oferty.'
                }
              >
                {/* Jedyne wezwanie do logowania na tym ekranie — drugiego pod stroną już nie ma. */}
                {isLoggedIn ? null : (
                  <Link
                    className="vbtn glowny"
                    href={`/logowanie?next=${encodeURIComponent(`/zlecenia/${order.id}`)}`}
                  >
                    Zaloguj się
                  </Link>
                )}
              </Komunikat>
            ) : oferty.length ? (
              <OfertyPorownanie oferty={oferty} mozeWybierac={order.status === 'PUBLISHED'} />
            ) : (
              <Komunikat
                ikona="hourglass-medium"
                tytul="Pierwsze oferty jeszcze nie przyszły"
                opis={`Zlecenie widzą Liderzy z branży ${order.industry.name}. Dostaniesz powiadomienie przy każdej ofercie.`}
              >
                <Udostepnij
                  href={`/zlecenia/${order.id}`}
                  tytul={order.title}
                  klasa="vbtn glowny"
                />
                <Link className="vbtn obrys" href="/uslugi">
                  Zobacz usługi Liderów
                </Link>
              </Komunikat>
            )}
            {/* ADR-004: przypis stoi pod ofertami zawsze, nie tylko przy porównaniu — oferta ani wybór nie dają punktów. */}
            <p className="rn-nic">
              <Ico n="seal-check" />
              <span>
                {viewer.isCompanyMember
                  ? 'Po zakończeniu pracy ocenisz wykonawcę.'
                  : 'Po zakończeniu pracy firma oceni wykonawcę.'}{' '}
                <b>Dopiero ta ocena daje mu punkty — do +100.</b> Oferta ani wybór wykonawcy punktów
                nie dają.
              </span>
            </p>
          </section>
        ) : null}

        {viewer.myOffer ? (
          <p className="rn-akcje muted">
            Twoja oferta: <b>{OFFER_STATUS_LABELS[viewer.myOffer.status]}</b> ·{' '}
            <Link href={`/oferty/${viewer.myOffer.id}`}>Rozmowa z firmą →</Link>
          </p>
        ) : null}

        {canOffer ? <OfferForm orderId={order.id} /> : null}

        {reviewsData && reviewsData.reviews.length > 0 ? (
          <section className="rn-sek">
            <h2>Oceny po zleceniu</h2>
            {reviewsData.reviews.map((review) => (
              <article className="rn-ocena" key={review.id}>
                <Aw name={review.authorName} size={40} />
                <div>
                  <div className="g">
                    <b>{review.authorName}</b>
                    <span className="of-ok" style={{ display: 'inline-flex' }}>
                      <Ico n="star" />
                      {review.rating}/5
                    </span>
                    <span>
                      · {review.direction === 'COMPANY_TO_LEADER' ? 'ocena Lidera' : 'ocena Firmy'}
                    </span>
                  </div>
                  {review.comment ? <p>{review.comment}</p> : null}
                </div>
              </article>
            ))}
          </section>
        ) : null}
        {reviewsData?.myReview && !reviewsData.myReview.published ? (
          <p className="rn-akcje muted">
            Twoja ocena czeka na ocenę drugiej strony (publikacja symultaniczna — maks. 14 dni).
          </p>
        ) : null}
        {canReview ? <ReviewForm orderId={order.id} /> : null}

        <div className="rn-stopka rn-st-szer">
          <Stopka />
        </div>
      </div>
    </Rama>
  );
}

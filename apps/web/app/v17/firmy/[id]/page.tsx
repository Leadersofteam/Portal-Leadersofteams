import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Rama, Stopka } from '@/components/v17/rama';
import { Wstecz } from '@/components/v17/rynek';
import { Aw } from '@/components/v17/znaki';
import { ORDER_STATUS_LABELS } from '@/lib/labels';
import { serverApiStatus } from '@/lib/server-api';
import { ocenaSrednia, plural } from '@/lib/v17';
import { loadJa } from '@/lib/v17-data';

interface CompanyProfile {
  company: {
    id: string;
    name: string;
    createdAt: string;
    nipVerifiedAt: string | null;
    description: string | null;
  };
  stats: {
    received: { averageRating: number | null; reviewCount: number };
    given: { averageRating: number | null; reviewCount: number };
    ordersPublished: number;
    ordersCompleted: number;
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    publishedAt: string | null;
    orderTitle: string | null;
    orderId: string | null;
    author: { displayName: string; handle: string | null };
  }>;
  orders: Array<{ id: string; title: string; status: string; industry: string }>;
}

// 404 → notFound(); każda inna porażka API → błąd ekranu (error.tsx), a nie fałszywe „nie znaleziono”.
const getCompany = cache(async (id: string) => {
  const r = await serverApiStatus<CompanyProfile>(`/companies/${id}`);
  if (r.status === 404) return null;
  if (!r.data) throw new Error(`Firma ${id}: API zwróciło ${r.status}`);
  return r.data;
});

// Staż w DOPEŁNIACZU, bo wchodzi w zdanie „Na Portalu od …”.
function tenureSince(iso: string): string {
  const months = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / (30 * 24 * 60 * 60 * 1000)),
  );
  if (months < 1) return 'mniej niż miesiąca';
  if (months === 1) return 'miesiąca';
  if (months < 12) return `${months} miesięcy`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'ponad roku' : `ponad ${years} lat`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCompany(id).catch(() => null);
  if (!data) return { title: 'Firma — Leaders of Teams' };
  return {
    title: `${data.company.name} — Firma na Leaders of Teams`,
    description: `Historia zleceń i oceny firmy ${data.company.name} na marketplace Liderów.`,
  };
}

// Publiczny profil Firmy: Lider widzi, komu poświęci czas na ofertę. Oceny z OBU stron —
// jednostronna karta zachęcałaby do wybielania.
export default async function FirmaV17({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCompany(id);
  if (!data) notFound();
  const { company, stats, reviews, orders } = data;
  const { received, given, ordersCompleted, ordersPublished } = stats;
  const ja = await loadJa();
  const nip = Boolean(company.nipVerifiedAt);

  return (
    <Rama
      aktywny="zlecenia"
      szeroka
      reszta
      ja={
        ja
          ? {
              name: ja.displayName,
              level: ja.level,
              handle: ja.handle,
              avatarFileId: ja.avatarFileId,
            }
          : null
      }
    >
      <div className="st">
        <Wstecz href="/zlecenia">Zlecenia</Wstecz>
        <div className="firma-gl">
          <Aw name={company.name} size={72} company />
          <div>
            <h1 className="st-h1" style={{ margin: '0 0 6px', fontSize: 30 }}>
              {company.name}
            </h1>
            <div className={nip ? 'zw' : 'zw brak'}>
              {nip ? (
                <>
                  <Ico n="seal-check" />
                  {/* Sprawdzamy wyłącznie sumę kontrolną — „zweryfikowany” byłoby obietnicą bez pokrycia. */}
                  <span title="Sprawdziliśmy poprawność formalną numeru (sumę kontrolną). Nie weryfikujemy wpisu w rejestrze.">
                    NIP — suma kontrolna OK
                  </span>
                  <span>·</span>
                </>
              ) : null}
              <span>Na Portalu od {tenureSince(company.createdAt)}</span>
            </div>
          </div>
        </div>
        {company.description ? (
          <p className="st-lid" style={{ marginTop: 16, fontSize: 15.5, whiteSpace: 'pre-line' }}>
            {company.description}
          </p>
        ) : null}
        <div className="liczby-r">
          <div>
            <b>{ordersCompleted}</b>
            <span>
              {plural(ordersCompleted, 'zrealizowane', 'zrealizowane', 'zrealizowanych')} z{' '}
              {ordersPublished}{' '}
              {ordersPublished === 1 ? 'opublikowanego zlecenia' : 'opublikowanych zleceń'}
            </span>
          </div>
          <div>
            {received.reviewCount > 0 && received.averageRating !== null ? (
              <>
                <b>
                  {ocenaSrednia(received.averageRating)}
                  <small style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>
                    /5
                  </small>
                </b>
                <span>
                  średnia z {received.reviewCount} {received.reviewCount === 1 ? 'oceny' : 'ocen'}{' '}
                  od Liderów
                </span>
              </>
            ) : (
              <>
                <b>—</b>
                <span>jeszcze nikt nie ocenił tej firmy</span>
              </>
            )}
          </div>
          <div>
            <b>{given.reviewCount}</b>
            <span>
              {plural(
                given.reviewCount,
                'ocena wystawiona Liderom',
                'oceny wystawione Liderom',
                'ocen wystawionych Liderom',
              )}
              {given.averageRating !== null
                ? ` · średnia ${ocenaSrednia(given.averageRating)}/5`
                : ''}
            </span>
          </div>
        </div>
        {nip ? (
          <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
            Znak NIP oznacza poprawną sumę kontrolną numeru. Nie weryfikujemy wpisu w rejestrze.
          </p>
        ) : null}
        <div className="dwie-f">
          <section className="st-sek" aria-labelledby="op">
            <h2 id="op">Opinie Liderów o tej firmie</h2>
            {reviews.length === 0 ? (
              <Komunikat
                ikona="chat-teardrop-text"
                tytul="Brak opublikowanych opinii"
                opis="Oceny pojawiają się dopiero wtedy, gdy obie strony je wystawią — albo po upływie okna 14 dni."
              />
            ) : (
              reviews.map((o) => (
                <article className="rn-ocena" key={o.id}>
                  <Aw name={o.author.displayName} size={40} />
                  <div>
                    <div className="g">
                      <b>
                        {o.author.handle ? (
                          <Link
                            href={`/profil/${o.author.handle}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              minHeight: 44,
                              margin: '-12px 0',
                            }}
                          >
                            {o.author.displayName}
                          </Link>
                        ) : (
                          o.author.displayName
                        )}
                      </b>
                      <span
                        className="of-ok"
                        style={{ display: 'inline-flex' }}
                        role="img"
                        aria-label={`${o.rating} na 5`}
                      >
                        <Ico n="star" />
                        {o.rating}/5
                      </span>
                      {o.publishedAt ? (
                        <span>
                          ·{' '}
                          {new Date(o.publishedAt).toLocaleDateString('pl-PL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            timeZone: 'Europe/Warsaw',
                          })}
                        </span>
                      ) : null}
                    </div>
                    {o.comment ? <p style={{ whiteSpace: 'pre-line' }}>{o.comment}</p> : null}
                    {o.orderId && o.orderTitle ? (
                      <Link
                        className="tl"
                        href={`/zlecenia/${o.orderId}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          minHeight: 44,
                          margin: '-8px 0',
                          fontSize: 13,
                        }}
                      >
                        {o.orderTitle}
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </section>
          <section className="st-sek" aria-labelledby="oz">
            <h2 id="oz">Ostatnie zlecenia</h2>
            {orders.length === 0 ? (
              <Komunikat
                ikona="clipboard-text"
                tytul="Jeszcze bez zleceń"
                opis="Ta firma nie opublikowała jeszcze żadnego zlecenia."
              />
            ) : (
              orders.map((z) => (
                <Link
                  className="zl-w"
                  key={z.id}
                  href={`/zlecenia/${z.id}`}
                  style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="zl-tyt" style={{ marginTop: 0 }}>
                      {z.title}
                    </div>
                    <div className="zl-fakty">
                      <span>{z.industry}</span>
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: 13,
                      fontWeight: 650,
                      color: z.status === 'PUBLISHED' ? 'var(--text-strong)' : 'var(--text-muted)',
                    }}
                  >
                    {ORDER_STATUS_LABELS[z.status] ?? z.status}
                  </div>
                </Link>
              ))
            )}
          </section>
        </div>
        <div className="rn-stopka rn-st-szer">
          <Stopka />
        </div>
      </div>
    </Rama>
  );
}

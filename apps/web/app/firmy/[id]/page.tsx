import Link from 'next/link';
import { notFound } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

interface CompanyProfile {
  company: { id: string; name: string; createdAt: string; nipVerifiedAt: string | null };
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
  orders: Array<{
    id: string;
    title: string;
    status: string;
    publishedAt: string | null;
    industry: string;
  }>;
}

/**
 * Staż Firmy w DOPEŁNIACZU, bo wchodzi w zdanie „Na Portalu od …".
 * Mianownik dawał tu „od 3 miesiące" i „od mniej niż miesiąc" — na polskim
 * portalu dla profesjonalistów błąd gramatyczny na wizytówce firmy kosztuje
 * wiarygodność bardziej niż brakująca funkcja.
 */
function tenureSince(iso: string): string {
  const months = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / (30 * 24 * 60 * 60 * 1000)),
  );
  if (months < 1) return 'mniej niż miesiąca';
  if (months === 1) return 'miesiąca';
  // Po „od" liczebnik zawsze łączy się z dopełniaczem liczby mnogiej.
  if (months < 12) return `${months} miesięcy`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'ponad roku' : `ponad ${years} lat`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<CompanyProfile>(`/companies/${id}`);
  if (!data) return { title: 'Firma — Leaders of Teams' };
  return {
    title: `${data.company.name} — Firma na Leaders of Teams`,
    description: `Historia zleceń i oceny firmy ${data.company.name} na marketplace Liderów.`,
  };
}

/**
 * Publiczny profil Firmy.
 *
 * Powstał, bo Lider składający ofertę widział wyłącznie NAZWĘ — czyli decydował
 * w ciemno, komu poświęci godziny na przygotowanie propozycji. Pokazujemy oceny
 * z OBU stron: nie tylko jak Firmę oceniają Liderzy, ale też jak ona ocenia ich.
 * Jednostronna karta zachęcałaby do wybielania; dwustronność jest uczciwsza
 * i zgodna z zasadą „dowód, nie deklaracja".
 */
export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<CompanyProfile>(`/companies/${id}`);
  if (!data) notFound();

  const { company, stats, reviews, orders } = data;

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/zlecenia">← Zlecenia</Link>
      </div>

      <header className="company-head">
        <h1>{company.name}</h1>
        <p className="muted">
          Na Portalu od {tenureSince(company.createdAt)}
          {company.nipVerifiedAt && (
            <>
              {' · '}
              {/* Copy jest tu istotne PRAWNIE: sprawdzamy wyłącznie poprawność
                  formalną numeru (suma kontrolna), a NIE istnienie firmy
                  w rejestrze. „NIP zweryfikowany" byłoby obietnicą, której
                  nie spełniamy — a marka Portalu stoi na „dowód, nie deklaracja". */}
              <span
                className="badge nip-badge"
                title="Sprawdziliśmy poprawność formalną numeru (sumę kontrolną). Nie weryfikujemy wpisu w rejestrze."
              >
                NIP — suma kontrolna OK
              </span>
            </>
          )}
        </p>
      </header>

      <section className="feature-grid">
        <div className="card">
          <h3>Zlecenia</h3>
          <p className="stat-number">{stats.ordersCompleted}</p>
          <p className="muted">zrealizowanych z {stats.ordersPublished} opublikowanych</p>
        </div>
        <div className="card">
          <h3>Oceny od Liderów</h3>
          <p className="stat-number">
            {stats.received.averageRating !== null ? `★ ${stats.received.averageRating}/5` : '—'}
          </p>
          <p className="muted">
            {stats.received.reviewCount > 0
              ? `na podstawie ${stats.received.reviewCount} ocen`
              : 'jeszcze nikt nie ocenił tej Firmy'}
          </p>
        </div>
        <div className="card">
          <h3>Oceny wystawione Liderom</h3>
          <p className="stat-number">
            {stats.given.averageRating !== null ? `★ ${stats.given.averageRating}/5` : '—'}
          </p>
          <p className="muted">
            {stats.given.reviewCount > 0
              ? `${stats.given.reviewCount} wystawionych ocen`
              : 'ta Firma nikogo jeszcze nie oceniła'}
          </p>
        </div>
      </section>

      <h2>Opinie Liderów o tej Firmie</h2>
      {reviews.length === 0 ? (
        <p className="muted">
          Brak opublikowanych opinii. Oceny pojawiają się dopiero wtedy, gdy obie strony je wystawią
          — albo po upływie okna 14 dni.
        </p>
      ) : (
        reviews.map((review) => (
          <div key={review.id} className="card" style={{ marginBottom: '0.75rem' }}>
            <h3>
              ★ {review.rating}/5{' '}
              {review.orderTitle && review.orderId && (
                <span className="muted">
                  · <Link href={`/zlecenia/${review.orderId}`}>{review.orderTitle}</Link>
                </span>
              )}
            </h3>
            {review.comment && <p className="pre-wrap">{review.comment}</p>}
            <p className="muted">
              {review.author.handle ? (
                <Link href={`/profil/${review.author.handle}`}>{review.author.displayName}</Link>
              ) : (
                review.author.displayName
              )}
              {review.publishedAt &&
                ` · ${new Date(review.publishedAt).toLocaleDateString('pl-PL')}`}
            </p>
          </div>
        ))
      )}

      <h2>Ostatnie zlecenia</h2>
      {orders.length === 0 ? (
        <p className="muted">Ta Firma nie opublikowała jeszcze żadnego zlecenia.</p>
      ) : (
        <ul className="plain-list">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/zlecenia/${order.id}`}>{order.title}</Link>{' '}
              <span className="muted">
                · {order.industry} · {order.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSearch } from '@/components/ui/icons';
import { LevelBadge } from '@/components/ui/level-badge';
import { formatBudget } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

export const metadata = {
  title: 'Szukaj — Leaders of Teams',
  robots: { index: false, follow: true },
};

type Tab = 'uslugi' | 'liderzy' | 'zlecenia' | 'wpisy' | 'pytania';

interface SearchResults {
  q: string;
  counts: Record<'listings' | 'leaders' | 'orders' | 'posts' | 'threads', number>;
  listings: Array<{
    id: string;
    slug: string;
    title: string;
    priceFrom: number;
    leader: { displayName: string; level: number; avatarFileId: string | null };
  }>;
  leaders: Array<{
    id: string;
    displayName: string;
    headline: string;
    level: number;
    avatarFileId: string | null;
  }>;
  orders: Array<{
    id: string;
    title: string;
    budgetMin: number;
    budgetMax: number;
    companyName: string;
  }>;
  posts: Array<{
    id: string;
    excerpt: string;
    author: { displayName: string; handle: string | null };
  }>;
  threads: Array<{ id: string; title: string; status: string }>;
}

const TABS: Array<{ key: Tab; label: string; countKey: keyof SearchResults['counts'] }> = [
  { key: 'uslugi', label: 'Usługi', countKey: 'listings' },
  { key: 'liderzy', label: 'Liderzy', countKey: 'leaders' },
  { key: 'zlecenia', label: 'Zlecenia', countKey: 'orders' },
  { key: 'wpisy', label: 'Wpisy', countKey: 'posts' },
  { key: 'pytania', label: 'Pytania', countKey: 'threads' },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const tab = (typeof params.zakladka === 'string' ? params.zakladka : 'uslugi') as Tab;

  const data =
    q.length >= 2
      ? await serverApi<SearchResults>(`/search?q=${encodeURIComponent(q)}`).catch(() => null)
      : null;

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <main>
      <h1>Szukaj w Portalu</h1>

      <form className="search-page-form" action="/szukaj" method="get" role="search">
        <label className="sr-only" htmlFor="q">
          Czego szukasz?
        </label>
        <div className="search-field">
          <IconSearch size={20} />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={80}
            placeholder="np. rekrutacja zespołu sprzedaży"
            autoComplete="off"
          />
        </div>
        <button className="btn" type="submit">
          Szukaj
        </button>
      </form>

      {q.length < 2 ? (
        <EmptyState art="search" title="Wpisz, czego szukasz">
          Przeszukamy naraz usługi Liderów, katalog Liderów, otwarte zlecenia, wpisy społeczności i
          pytania w grupach.
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState
          art="search"
          title={`Brak wyników dla „${q}"`}
          ctaHref="/uslugi"
          ctaLabel="Przeglądaj wszystkie usługi"
        >
          Spróbuj krótszej frazy albo innego słowa. Wskazówka: bardzo krótkie słowa (jak „HR" czy
          „IT") indeks pomija — poszukaj ich przez tagi w katalogu usług.
        </EmptyState>
      ) : (
        <>
          <nav className="search-tabs" aria-label="Kategorie wyników">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/szukaj?q=${encodeURIComponent(q)}&zakladka=${t.key}`}
                className={tab === t.key ? 'active' : ''}
              >
                {t.label}
                <span className="search-tab-count">{data?.counts[t.countKey] ?? 0}</span>
              </Link>
            ))}
          </nav>

          {tab === 'uslugi' &&
            (data!.listings.length === 0 ? (
              <p className="muted">Brak usług dla tej frazy.</p>
            ) : (
              data!.listings.map((l) => (
                <div key={l.id} className="list-row list-row--stack">
                  <div>
                    <h3>
                      <Link href={`/uslugi/${l.slug}`}>{l.title}</Link>
                    </h3>
                    <div className="meta">
                      {l.leader.displayName}
                      {l.leader.level >= 1 && (
                        <>
                          {' '}
                          <LevelBadge level={l.leader.level} />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="list-row-aside">
                    <strong>od {l.priceFrom} zł</strong>
                  </div>
                </div>
              ))
            ))}

          {tab === 'liderzy' &&
            (data!.leaders.length === 0 ? (
              <p className="muted">Brak Liderów dla tej frazy.</p>
            ) : (
              data!.leaders.map((p) => (
                <div key={p.id} className="list-row list-row--stack">
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Avatar
                      name={p.displayName}
                      size="sm"
                      src={p.avatarFileId ? `/api/v1/files/${p.avatarFileId}/thumb` : null}
                    />
                    <div>
                      <h3>
                        <Link href={`/liderzy/${p.id}`}>{p.displayName}</Link>
                      </h3>
                      <div className="meta">{p.headline}</div>
                    </div>
                  </div>
                  <div className="list-row-aside">
                    {p.level >= 1 && <LevelBadge level={p.level} />}
                  </div>
                </div>
              ))
            ))}

          {tab === 'zlecenia' &&
            (data!.orders.length === 0 ? (
              <p className="muted">Brak zleceń dla tej frazy.</p>
            ) : (
              data!.orders.map((o) => (
                <div key={o.id} className="list-row list-row--stack">
                  <div>
                    <h3>
                      <Link href={`/zlecenia/${o.id}`}>{o.title}</Link>
                    </h3>
                    <div className="meta">{o.companyName}</div>
                  </div>
                  <div className="list-row-aside">
                    <strong>{formatBudget(o.budgetMin, o.budgetMax)}</strong>
                  </div>
                </div>
              ))
            ))}

          {tab === 'wpisy' &&
            (data!.posts.length === 0 ? (
              <p className="muted">Brak wpisów dla tej frazy.</p>
            ) : (
              data!.posts.map((p) => (
                <div key={p.id} className="list-row list-row--stack">
                  <div>
                    <h3>
                      <Link href={`/wpisy/${p.id}`}>{p.excerpt}</Link>
                    </h3>
                    <div className="meta">{p.author.displayName}</div>
                  </div>
                </div>
              ))
            ))}

          {tab === 'pytania' &&
            (data!.threads.length === 0 ? (
              <p className="muted">Brak pytań dla tej frazy.</p>
            ) : (
              data!.threads.map((t) => (
                <div key={t.id} className="list-row list-row--stack">
                  <div>
                    <h3>
                      <Link href={`/watki/${t.id}`}>{t.title}</Link>
                    </h3>
                  </div>
                </div>
              ))
            ))}
        </>
      )}
    </main>
  );
}

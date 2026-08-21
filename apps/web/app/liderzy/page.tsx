import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LevelBadge } from '@/components/ui/level-badge';
import { levelName } from '@/lib/levels';
import { serverApi } from '@/lib/server-api';

interface LeaderRow {
  id: string;
  displayName: string;
  avatarFileId: string | null;
  headline: string;
  industry: { name: string; slug: string };
  level: number;
  averageRating: number | null;
  reviewCount: number;
}

interface Industry {
  id: string;
  name: string;
}

export const metadata = {
  title: 'Liderzy — katalog zweryfikowanych ekspertów | Leaders of Teams',
  description:
    'Przeglądaj Liderów Leaders of Teams: poziom w Drabince zdobyty realną pracą i mentoringiem, oceny od firm, branża i specjalizacja. Znajdź eksperta do swojego zlecenia.',
};

export default async function LeadersDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['industryId', 'q', 'cursor'] as const) {
    const value = params[key];
    if (typeof value === 'string' && value) query.set(key, value);
  }

  const [data, industriesData] = await Promise.all([
    serverApi<{ leaders: LeaderRow[]; nextCursor: string | null }>(`/leaders?${query.toString()}`),
    serverApi<{ industries: Industry[] }>('/industries'),
  ]);
  const leaders = data?.leaders ?? [];
  const industries = industriesData?.industries ?? [];

  const nextParams = new URLSearchParams(query);
  if (data?.nextCursor) nextParams.set('cursor', data.nextCursor);

  return (
    <main>
      <h1>Liderzy</h1>
      <p className="muted">
        Katalog Liderów Leaders of Teams. Poziom w Drabince zdobywa się wyłącznie realną pracą i
        mentoringiem — to zweryfikowany dowód, nie deklaracja.
      </p>

      <form className="filters" method="get">
        <div className="field">
          <label htmlFor="q">Szukaj</label>
          <input
            id="q"
            name="q"
            defaultValue={typeof params.q === 'string' ? params.q : ''}
            placeholder="np. automatyzacja, performance marketing"
          />
        </div>
        <div className="field">
          <label htmlFor="industryId">Branża</label>
          <select
            id="industryId"
            name="industryId"
            defaultValue={typeof params.industryId === 'string' ? params.industryId : ''}
          >
            <option value="">Wszystkie</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit">
          Filtruj
        </button>
      </form>

      {leaders.length === 0 ? (
        <EmptyState
          art="search"
          title="Brak Liderów spełniających kryteria"
          ctaHref="/liderzy"
          ctaLabel="Wyczyść filtry"
        >
          Spróbuj innej branży lub frazy — albo zostań pierwszym Liderem w tej specjalizacji.
        </EmptyState>
      ) : (
        <div>
          {leaders.map((leader) => (
            <div key={leader.id} className="list-row list-row--stack">
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                <Avatar
                  name={leader.displayName}
                  src={leader.avatarFileId ? `/api/v1/files/${leader.avatarFileId}/thumb` : null}
                />
                <div>
                  <h3>
                    <Link href={`/liderzy/${leader.id}`}>{leader.displayName}</Link>
                  </h3>
                  <div className="meta">{leader.headline}</div>
                  <div className="meta muted">{leader.industry.name}</div>
                </div>
              </div>
              <div className="text-right list-row-aside">
                <LevelBadge level={leader.level} name={levelName(leader.level)} />
                {leader.reviewCount > 0 && (
                  <div className="mt-1">
                    <span className="badge">
                      ★ {leader.averageRating}/5 ({leader.reviewCount}{' '}
                      {leader.reviewCount === 1 ? 'ocena' : 'ocen'})
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.nextCursor && (
        <p className="mt-3">
          <Link className="btn secondary" href={`/liderzy?${nextParams.toString()}`}>
            Wczytaj więcej
          </Link>
        </p>
      )}
    </main>
  );
}

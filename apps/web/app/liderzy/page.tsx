import Link from 'next/link';

import { CollapsibleFilters } from '@/components/ui/collapsible-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { IndustryChips } from '@/components/ui/industry-chips';
import { LeaderRow, type LeaderRowData } from '@/components/ui/leader-row';
import { publicApi } from '@/lib/server-api';

type LeaderRow = LeaderRowData;

interface Industry {
  id: string;
  name: string;
  slug: string;
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
    // PL4: publicApi — lista publiczna, bez cookies (uzasadnienie w /zlecenia).
    publicApi<{ leaders: LeaderRow[]; nextCursor: string | null }>(
      `/leaders?${query.toString()}`,
      0,
    ),
    publicApi<{ industries: Industry[] }>('/industries'),
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

      {/* PL4: chipy branż → huby /liderzy/branza/[slug]. */}
      <IndustryChips industries={industries} base="/liderzy" allHref="/liderzy" />

      <CollapsibleFilters>
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
      </CollapsibleFilters>

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
            <LeaderRow key={leader.id} leader={leader} />
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

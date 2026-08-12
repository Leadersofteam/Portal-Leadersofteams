import Link from 'next/link';

import { GROUP_TYPE_LABELS } from '@/lib/labels';
import { EmptyState } from '@/components/ui/empty-state';
import { serverApi } from '@/lib/server-api';

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isSystem: boolean;
  industry: { id: string; name: string } | null;
  membersCount: number;
  postsCount: number;
}

interface Industry {
  id: string;
  name: string;
}

export const metadata = { title: 'Grupy branżowe — Leaders of Teams' };

export default async function GroupsPage({
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
    serverApi<{ groups: GroupRow[]; nextCursor: string | null }>(`/groups?${query.toString()}`),
    serverApi<{ industries: Industry[] }>('/industries'),
  ]);
  const groups = data?.groups ?? [];
  const industries = industriesData?.industries ?? [];

  const nextParams = new URLSearchParams(query);
  if (data?.nextCursor) nextParams.set('cursor', data.nextCursor);

  return (
    <main>
      <h1>Grupy branżowe</h1>
      <p className="muted">
        Wymieniaj się doświadczeniami, case studies i pomysłami w grupach sektorowych. Aktywność w
        grupach nie generuje punktów Drabinki — liczy się realna praca i mentoring.
      </p>

      <form className="filters" method="get">
        <div className="field">
          <label htmlFor="q">Szukaj</label>
          <input
            id="q"
            name="q"
            defaultValue={typeof params.q === 'string' ? params.q : ''}
            placeholder="np. automatyzacja"
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

      {groups.length === 0 ? (
        <EmptyState art="ladder" title="Brak grup spełniających kryteria">
          Zmień filtry — grupy branżowe może zakładać każdy Lider od poziomu 2.
        </EmptyState>
      ) : (
        <div>
          {groups.map((group) => (
            <div key={group.id} className="list-row">
              <div>
                <h3>
                  <Link href={`/grupy/${group.id}`}>{group.name}</Link>
                </h3>
                <div className="meta">
                  {group.industry ? `${group.industry.name} · ` : ''}
                  {group.membersCount} członków · {group.postsCount} postów
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge">{GROUP_TYPE_LABELS[group.type] ?? group.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.nextCursor && (
        <p style={{ marginTop: '1.5rem' }}>
          <Link className="btn secondary" href={`/grupy?${nextParams.toString()}`}>
            Następna strona →
          </Link>
        </p>
      )}
    </main>
  );
}

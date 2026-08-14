import Link from 'next/link';

import { formatBudget } from '@/lib/labels';
import { EmptyState } from '@/components/ui/empty-state';
import { serverApi } from '@/lib/server-api';

interface OrderRow {
  id: string;
  title: string;
  industry: { id: string; name: string };
  budgetMin: number;
  budgetMax: number;
  minLevel: number;
  companyName: string;
}

interface Industry {
  id: string;
  name: string;
}

export const metadata = { title: 'Zlecenia — Leaders of Teams' };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['industryId', 'q', 'budgetMin', 'budgetMax', 'cursor'] as const) {
    const value = params[key];
    if (typeof value === 'string' && value) query.set(key, value);
  }

  const [data, industriesData] = await Promise.all([
    serverApi<{ orders: OrderRow[]; nextCursor: string | null }>(`/orders?${query.toString()}`),
    serverApi<{ industries: Industry[] }>('/industries'),
  ]);
  const orders = data?.orders ?? [];
  const industries = industriesData?.industries ?? [];

  const nextParams = new URLSearchParams(query);
  if (data?.nextCursor) nextParams.set('cursor', data.nextCursor);

  return (
    <main>
      <h1>Zlecenia</h1>
      <p className="muted">
        Wszystkie opublikowane zlecenia są jawne. Ofertowanie zleceń z wymaganym poziomem
        odblokowuje awans w Drabince Lidera.
      </p>

      <form className="filters" method="get">
        <div className="field">
          <label htmlFor="q">Szukaj</label>
          <input
            id="q"
            name="q"
            defaultValue={typeof params.q === 'string' ? params.q : ''}
            placeholder="np. automatyzacja CRM"
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
        <div className="field">
          <label htmlFor="budgetMin">Budżet od (zł)</label>
          <input
            id="budgetMin"
            name="budgetMin"
            type="number"
            min={0}
            defaultValue={typeof params.budgetMin === 'string' ? params.budgetMin : ''}
          />
        </div>
        <button className="btn" type="submit">
          Filtruj
        </button>
      </form>

      {orders.length === 0 ? (
        <EmptyState
          art="search"
          title="Brak zleceń spełniających kryteria"
          ctaHref="/zlecenia/nowe"
          ctaLabel="Dodaj pierwsze zlecenie"
        >
          Zmień filtry — albo opublikuj własne zlecenie i pozwól Liderom złożyć oferty.
        </EmptyState>
      ) : (
        <div>
          {orders.map((order) => (
            <div key={order.id} className="list-row">
              <div>
                <h3>
                  <Link href={`/zlecenia/${order.id}`}>{order.title}</Link>
                </h3>
                <div className="meta">
                  {order.companyName} · {order.industry.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>{formatBudget(order.budgetMin, order.budgetMax)}</div>
                {order.minLevel > 0 && (
                  <span className="badge accent">wymagany poziom {order.minLevel}+</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.nextCursor && (
        <p style={{ marginTop: '1.5rem' }}>
          <Link className="btn secondary" href={`/zlecenia?${nextParams.toString()}`}>
            Następna strona →
          </Link>
        </p>
      )}
    </main>
  );
}

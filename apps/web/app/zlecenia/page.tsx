import Link from 'next/link';

import { CollapsibleFilters } from '@/components/ui/collapsible-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { IndustryChips } from '@/components/ui/industry-chips';
import { OrderRow, type OrderRowData } from '@/components/ui/order-row';
import { publicApi } from '@/lib/server-api';

type OrderRow = OrderRowData;

interface Industry {
  id: string;
  name: string;
  slug: string;
}

export const metadata = { title: 'Zlecenia — Leaders of Teams' };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hasFilters = Boolean(
    (typeof params.q === 'string' && params.q) ||
    (typeof params.industryId === 'string' && params.industryId) ||
    (typeof params.budgetMin === 'string' && params.budgetMin),
  );
  const query = new URLSearchParams();
  for (const key of ['industryId', 'q', 'budgetMin', 'budgetMax', 'cursor'] as const) {
    const value = params[key];
    if (typeof value === 'string' && value) query.set(key, value);
  }

  const [data, industriesData] = await Promise.all([
    // PL4: publicApi bez cookies — lista jest publiczna. Revalidate 0 (bez cache
    // danych Nexta): świeżo opublikowane zlecenie MA być widoczne od razu — cache
    // 60 s ukrył je przed Firmą tuż po publikacji (e2e ścieżki krytycznej).
    // Cache-aside z inwalidacją przy publikacji żyje po stronie API.
    publicApi<{ orders: OrderRow[]; nextCursor: string | null }>(`/orders?${query.toString()}`, 0),
    publicApi<{ industries: Industry[] }>('/industries'),
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

      {/* PL4: chipy branż prowadzą do hubów /zlecenia/branza/[slug] — nawigacja, nie ranking. */}
      <IndustryChips industries={industries} base="/zlecenia" allHref="/zlecenia" />

      <CollapsibleFilters>
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
      </CollapsibleFilters>

      {orders.length === 0 ? (
        /* CTA zależne od kontekstu (ux-copy, PD4) — jak na /uslugi. */
        hasFilters ? (
          <EmptyState
            art="search"
            title="Brak zleceń spełniających kryteria"
            ctaHref="/zlecenia"
            ctaLabel="Wyczyść filtry"
          >
            Poluzuj kryteria — pełna lista zleceń czeka obok.
          </EmptyState>
        ) : (
          <EmptyState
            art="lantern"
            title="Nikt jeszcze nie dodał zlecenia"
            ctaHref="/zlecenia/nowe"
            ctaLabel="Dodaj pierwsze zlecenie"
          >
            Opublikuj własne zlecenie i pozwól Liderom złożyć oferty.
          </EmptyState>
        )
      ) : (
        <div>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
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

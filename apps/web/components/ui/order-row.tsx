import Link from 'next/link';

import { formatBudget } from '@/lib/labels';

// Wiersz zlecenia na listach (/zlecenia i huby branżowe PL4). Jeden komponent,
// żeby hub nie stał się drugą kopią listy — dokładnie ta pułapka rozjechała
// karty usług przed PD3 (katalog vs ulubione).
export interface OrderRowData {
  id: string;
  title: string;
  industry: { id: string; name: string };
  budgetMin: number;
  budgetMax: number;
  minLevel: number;
  companyName: string;
}

export function OrderRow({ order }: { order: OrderRowData }) {
  return (
    <div className="list-row list-row--stack">
      <div>
        <h3>
          <Link href={`/zlecenia/${order.id}`}>{order.title}</Link>
        </h3>
        <div className="meta">
          {order.companyName} · {order.industry.name}
        </div>
      </div>
      <div className="list-row-aside" style={{ textAlign: 'right' }}>
        <div>{formatBudget(order.budgetMin, order.budgetMax)}</div>
        {order.minLevel > 0 && (
          <span className="badge accent">wymagany poziom {order.minLevel}+</span>
        )}
      </div>
    </div>
  );
}

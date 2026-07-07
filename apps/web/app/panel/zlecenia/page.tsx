import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ORDER_STATUS_LABELS } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

interface MyOrder {
  id: string;
  title: string;
  status: string;
  industry: string;
  offersCount: number;
  companyName: string;
}

export const metadata = { title: 'Zlecenia mojej firmy — Leaders of Teams' };

export default async function MyOrdersPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const data = await serverApi<{ orders: MyOrder[] }>('/me/orders');
  const orders = data?.orders ?? [];

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link>
      </div>
      <h1>Zlecenia mojej firmy</h1>
      <p>
        <Link className="btn" href="/zlecenia/nowe">
          + Nowe zlecenie
        </Link>
      </p>
      {orders.length === 0 ? (
        <p className="muted">Twoja firma nie ma jeszcze zleceń.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="list-row">
            <div>
              <h3>
                <Link href={`/zlecenia/${order.id}`}>{order.title}</Link>
              </h3>
              <div className="meta">
                {order.companyName} · {order.industry} · ofert: {order.offersCount}
              </div>
            </div>
            <span className="badge">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
          </div>
        ))
      )}
    </main>
  );
}

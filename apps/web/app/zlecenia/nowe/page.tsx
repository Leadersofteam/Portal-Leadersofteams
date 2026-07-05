import { redirect } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

import { NewOrderForm } from './new-order-form';

export const metadata = { title: 'Nowe zlecenie — Leaders of Teams' };

export default async function NewOrderPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const [companies, industries] = await Promise.all([
    serverApi<{ companies: Array<{ id: string; name: string }> }>('/me/companies'),
    serverApi<{ industries: Array<{ id: string; name: string }> }>('/industries'),
  ]);

  return (
    <main>
      <NewOrderForm
        companies={companies?.companies ?? []}
        industries={industries?.industries ?? []}
      />
    </main>
  );
}

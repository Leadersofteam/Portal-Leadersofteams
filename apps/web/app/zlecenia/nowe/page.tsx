import { serverApi } from '@/lib/server-api';

import { NewOrderForm } from './new-order-form';

export const metadata = { title: 'Nowe zlecenie — Leaders of Teams' };

// PL2 „Firma w 90 sekund" (D2): gość NIE trafia już na ścianę logowania.
// Widzi ten sam formularz potrzeby; szkic ląduje w przeglądarce, konto i firmę
// zakłada jednym krokiem na /rejestracja?cel=firma, a po powrocie formularz
// jest wypełniony i zapisuje szkic. Publikacja wymaga potwierdzonego adresu
// (bramka w API, gdy poczta włączona) — to jedyna bariera, i celowo późna.
export default async function NewOrderPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  const isLoggedIn = Boolean(me?.user);

  const [companies, industries] = await Promise.all([
    isLoggedIn
      ? serverApi<{ companies: Array<{ id: string; name: string }> }>('/me/companies')
      : Promise.resolve(null),
    serverApi<{ industries: Array<{ id: string; name: string }> }>('/industries'),
  ]);

  return (
    <main>
      <NewOrderForm
        guest={!isLoggedIn}
        companies={companies?.companies ?? []}
        industries={industries?.industries ?? []}
      />
    </main>
  );
}

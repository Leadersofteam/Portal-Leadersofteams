import Link from 'next/link';
import { redirect } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

import { InviteForm } from './invite-form';

export const metadata = { title: 'Zaproś Lidera — Leaders of Teams' };

// Zaproszenie Lidera (PL5, S19 pkt 2). Strona mówi WPROST, czego tu nie ma:
// punktów, nagród, listy zaproszonych. To nie jest marketing — to konstrukcja
// (ADR-004/ADR-011), a strona ma ją pokazać osobie, która zaprasza.
export default async function InvitePage() {
  const me = await serverApi<{ user: { id: string; displayName: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link>
      </div>
      <h1>Zaproś Lidera</h1>
      <p className="muted" style={{ maxWidth: '44rem' }}>
        Znasz kogoś, kto prowadzi zespoły albo realizuje projekty i powinien być tu z Tobą? Wyślemy
        w Twoim imieniu jeden mail z linkiem do Drogi Lidera.{' '}
        <strong>Nic za to nie dostajesz</strong> — żadnych punktów, prowizji ani miejsca w
        „strukturze". Nie zapisujemy też, kto kogo zaprosił. Zapraszasz, bo uważasz, że warto — i to
        jest cały mechanizm.
      </p>
      <InviteForm />
      <p className="muted mt-2">
        Dlaczego tak? <Link href="/drabinka">Zero punktów za zapraszanie</Link> to nie regulamin,
        tylko konstrukcja Drabinki — bez tego statusu Lidera nie dałoby się odróżnić od statusu w
        piramidzie.
      </p>
    </main>
  );
}

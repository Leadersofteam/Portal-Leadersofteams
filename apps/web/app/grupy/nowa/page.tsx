import Link from 'next/link';
import { redirect } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

import { NewGroupForm } from './new-group-form';

export const metadata = { title: 'Załóż grupę — Leaders of Teams' };

export default async function NewGroupPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const industriesData = await serverApi<{ industries: Array<{ id: string; name: string }> }>(
    '/industries',
  );

  return (
    <main>
      <p className="breadcrumbs">
        <Link href="/grupy">← Grupy</Link>
      </p>
      <h1>Załóż grupę branżową</h1>
      <p className="muted">
        Zakładasz grupę — zostajesz jej moderatorem: przypinasz wątek powitalny, decydujesz o
        składzie i zdejmujesz treści, które nie pasują. Zakładanie grup wymaga poziomu 2 w Drabince
        Lidera; to bariera antyspamowa przy otwartej rejestracji, nie przywilej. Aktywność w grupach
        nie daje punktów.
      </p>
      <NewGroupForm industries={industriesData?.industries ?? []} />
    </main>
  );
}

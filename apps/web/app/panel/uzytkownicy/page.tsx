import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { AdminUserListItem } from '@lot/contracts';

import { serverApi } from '@/lib/server-api';

import { UsersManager } from './users-manager';

export const metadata = { title: 'Użytkownicy — Leaders of Teams' };

// Administracja użytkownikami (19.08). Do tej pory nadanie roli MODERATOR
// wymagało ręcznego SQL-a na produkcji, a rola zamrożona w sesji Redis
// oznaczała dodatkowo „i poproś tę osobę o wylogowanie". Ta strona + trasy
// /admin/users domykają temat: zmiana roli z UI, sesje unieważniane od razu.
export default async function UsersAdminPage() {
  const me = await serverApi<{ user: { id: string; role: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');
  if (me.user.role !== 'ADMIN') redirect('/panel');

  const data = await serverApi<{ users: AdminUserListItem[] }>('/admin/users');

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link>
      </div>
      <h1>Użytkownicy</h1>
      <p className="muted">
        Nadawanie i odbieranie roli <strong>moderatora</strong>. Zmiana roli od razu wylogowuje tę
        osobę wszędzie — po ponownym zalogowaniu widzi już nowe uprawnienia. Rolą ADMIN zarządza się
        poza aplikacją.
      </p>

      <UsersManager initialUsers={data?.users ?? []} myId={me.user.id} />
    </main>
  );
}

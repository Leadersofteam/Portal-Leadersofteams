import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { SessionUser } from '@lot/contracts';

import { serverApi } from '@/lib/server-api';

import { AccountActions } from './account-actions';

export const metadata = { title: 'Konto i dane — Leaders of Teams' };

// RODO dostaje ścieżkę użytkownika (S18).
//
// `GET /me/export` i `DELETE /me` działały od D6 i przez cały ten czas NIE MIAŁY
// w całej aplikacji ani jednego wywołania — a `/prywatnosc` §5 twierdziła, że
// „w panelu konta możesz pobrać komplet swoich danych". To był obowiązek prawny
// (R-10) żyjący wyłącznie w backendzie, czyli dokładnie ta sama mina co martwy
// reset hasła: zielone testy API, zero drogi dla człowieka.
//
// Strona leży pod `/panel`, więc robots.ts wyklucza ją z indeksacji razem z całą
// strefą — bez osobnej reguły, o której ktoś kiedyś by zapomniał.
export default async function AccountPage() {
  const me = await serverApi<{ user: SessionUser | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');
  const user = me.user;

  const verification = await serverApi<{ email: string; verified: boolean }>('/me/verification');

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Baza wspinacza</Link>
      </div>

      <h1>Konto i dane</h1>
      <p className="muted">
        Twoje prawa z RODO w jednym miejscu. Szczegóły przetwarzania opisuje{' '}
        <Link href="/prywatnosc">polityka prywatności</Link>.
      </p>

      <section className="card mt-3">
        <h3>Dane konta</h3>
        <dl className="account-facts">
          <div>
            <dt>Nazwa</dt>
            <dd>{user.displayName}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>
              {user.email}{' '}
              {verification?.verified ? (
                <span className="badge success">potwierdzony</span>
              ) : (
                <span className="badge warning">niepotwierdzony</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Rola</dt>
            <dd>{user.role === 'USER' ? 'Użytkownik' : user.role}</dd>
          </div>
        </dl>
        <p className="muted">
          Nazwę zmienisz w <Link href="/panel/profil">profilu Lidera</Link>.
        </p>
      </section>

      <AccountActions />
    </main>
  );
}

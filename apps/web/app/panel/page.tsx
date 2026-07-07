import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { SessionUser } from '@lot/contracts';

import { serverApi } from '@/lib/server-api';

import { LogoutButton } from './logout-button';

export default async function PanelPage() {
  const me = await serverApi<{ user: SessionUser | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');
  const user = me.user;

  const [profile, companies, ladder] = await Promise.all([
    serverApi<{ profile: { id: string; headline: string } | null }>('/me/leader-profile'),
    serverApi<{ companies: Array<{ id: string; name: string }> }>('/me/companies'),
    serverApi<{
      state: { level: number; levelName: string | null; totalPoints: number };
      nextLevel: { missingPoints: number; level: number } | null;
    }>('/me/ladder'),
  ]);

  return (
    <main>
      <h1>Cześć, {user.displayName}!</h1>
      <p className="muted">Twoje konto: {user.email}</p>

      <nav className="panel-nav">
        <Link className="btn secondary" href="/panel/profil">
          Profil Lidera
        </Link>
        <Link className="btn secondary" href="/panel/oferty">
          Moje oferty
        </Link>
        <Link className="btn secondary" href="/panel/zlecenia">
          Zlecenia firmy
        </Link>
        <Link className="btn" href="/zlecenia/nowe">
          + Nowe zlecenie
        </Link>
      </nav>

      <section className="feature-grid">
        <div className="card">
          <h3>Strona Lidera</h3>
          {profile?.profile ? (
            <p>
              Twój profil: „{profile.profile.headline}”.{' '}
              <Link href={`/liderzy/${profile.profile.id}`}>Zobacz publiczny profil →</Link>
            </p>
          ) : (
            <p>
              Nie masz jeszcze profilu Lidera. <Link href="/panel/profil">Utwórz go</Link>, żeby
              składać oferty na zlecenia.
            </p>
          )}
        </div>
        <div className="card">
          <h3>Strona Firmy</h3>
          {companies?.companies?.length ? (
            <p>
              Twoje firmy: {companies.companies.map((c) => c.name).join(', ')}.{' '}
              <Link href="/panel/zlecenia">Zarządzaj zleceniami →</Link>
            </p>
          ) : (
            <p>
              Chcesz zlecać pracę? <Link href="/firma/nowa">Utwórz profil firmy</Link> i opublikuj
              pierwsze zlecenie.
            </p>
          )}
        </div>
        <div className="card">
          <h3>Drabinka Lidera</h3>
          <p>
            Poziom {ladder?.state.level ?? 0}
            {ladder?.state.levelName ? ` — ${ladder.state.levelName}` : ''} ·{' '}
            {ladder?.state.totalPoints ?? 0} pkt
            {ladder?.nextLevel
              ? ` · do poziomu ${ladder.nextLevel.level} brakuje ${ladder.nextLevel.missingPoints} pkt`
              : ''}
            . <Link href="/panel/punkty">Moje punkty →</Link>
          </p>
        </div>
      </section>

      <p style={{ marginTop: '2rem' }}>
        <LogoutButton />
      </p>
    </main>
  );
}

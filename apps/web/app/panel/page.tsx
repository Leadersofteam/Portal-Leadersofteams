import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type { SessionUser } from '@lot/contracts';

import { LogoutButton } from './logout-button';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json()) as { user: SessionUser | null };
  return body.user;
}

export default async function PanelPage() {
  const user = await getSessionUser();
  if (!user) redirect('/logowanie');

  return (
    <main>
      <h1>Cześć, {user.displayName}!</h1>
      <p className="muted">Twoje konto: {user.email}</p>
      <section className="feature-grid">
        <div className="card">
          <h3>Drabinka Lidera</h3>
          <p>Poziom 0 — start. Moduł punktów pojawi się w kolejnych sprintach.</p>
        </div>
        <div className="card">
          <h3>Zlecenia</h3>
          <p>Marketplace w budowie (Faza 1, sprint 1–2).</p>
        </div>
        <div className="card">
          <h3>Grupy branżowe</h3>
          <p>Społeczność w budowie (Faza 1, sprint 4–5).</p>
        </div>
      </section>
      <p style={{ marginTop: '2rem' }}>
        <LogoutButton />
      </p>
    </main>
  );
}

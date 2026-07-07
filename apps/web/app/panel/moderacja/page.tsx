import Link from 'next/link';
import { redirect } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

import { ResolveButtons } from './resolve-buttons';

interface ModerationCase {
  id: string;
  source: string;
  note: string | null;
  subjectUserId: string | null;
  pointEventId: string | null;
  createdAt: string;
}

export const metadata = { title: 'Moderacja — Leaders of Teams' };

export default async function ModerationPage() {
  const me = await serverApi<{ user: { role: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');
  if (!['MODERATOR', 'ADMIN'].includes(me.user.role)) redirect('/panel');

  const data = await serverApi<{ cases: ModerationCase[] }>('/moderation/cases?status=OPEN');
  const cases = data?.cases ?? [];

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link>
      </div>
      <h1>Moderacja — otwarte sprawy</h1>
      <p className="muted">
        Sygnały antyfraudowe wstrzymują punkty w karencji do decyzji człowieka (ADR-004). „Zwolnij"
        przywraca punkty do karencji, „Odrzuć" cofa je trwale.
      </p>
      {cases.length === 0 ? (
        <p className="muted">Brak otwartych spraw. 🎉</p>
      ) : (
        cases.map((moderationCase) => (
          <div key={moderationCase.id} className="card" style={{ marginBottom: '1rem' }}>
            <h3>
              <span className="badge accent">{moderationCase.source}</span>{' '}
              {new Date(moderationCase.createdAt).toLocaleString('pl-PL')}
            </h3>
            <p>{moderationCase.note}</p>
            <p className="muted">
              Użytkownik: {moderationCase.subjectUserId ?? '—'} · Wpis punktowy:{' '}
              {moderationCase.pointEventId ?? '—'}
            </p>
            <ResolveButtons caseId={moderationCase.id} />
          </div>
        ))
      )}
    </main>
  );
}

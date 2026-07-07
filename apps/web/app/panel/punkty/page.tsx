import Link from 'next/link';
import { redirect } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

interface LadderData {
  state: {
    level: number;
    levelName: string | null;
    isLeader: boolean;
    marketplacePoints: number;
    communityPoints: number;
    totalPoints: number;
    rulesetVersion: string;
  };
  nextLevel: {
    level: number;
    name: string;
    pointsRequired: number;
    missingPoints: number;
    minPathSharePct: number;
  } | null;
  events: Array<{
    id: string;
    type: string;
    points: number;
    status: string;
    meta: { explanation?: string };
    createdAt: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Karencja (7 dni)',
  CONFIRMED: 'Zaliczone',
  HOLD: 'Wstrzymane (weryfikacja)',
  REVERSED: 'Cofnięte',
};

const TYPE_LABELS: Record<string, string> = {
  ORDER_COMPLETED_RATED: 'Ocenione zlecenie',
  ANSWER_ACCEPTED: 'Zaakceptowana odpowiedź',
  ANSWER_UPVOTED_QUALIFIED: 'Docenione odpowiedzi',
  MENTORSHIP_SESSION_RATED: 'Sesja mentoringowa',
  ADJUSTMENT_MODERATION: 'Korekta moderacyjna',
};

export const metadata = { title: 'Moje punkty — Leaders of Teams' };

export default async function MyPointsPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const data = await serverApi<LadderData>('/me/ladder');
  if (!data) redirect('/logowanie');
  const { state, nextLevel, events } = data;

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link> · <Link href="/drabinka">Zasady punktacji</Link>
      </div>
      <h1>Moje punkty — Drabinka Lidera</h1>

      <section className="feature-grid">
        <div className="card">
          <h3>Poziom</h3>
          <p style={{ fontSize: '1.6rem', margin: 0 }}>
            {state.level}
            {state.levelName ? ` — ${state.levelName}` : ''}
          </p>
          <p className="muted">
            {state.isLeader ? 'Masz tytuł Lidera' : 'Tytuł Lidera od poziomu 1'}
          </p>
        </div>
        <div className="card">
          <h3>Punkty zaliczone</h3>
          <p style={{ fontSize: '1.6rem', margin: 0 }}>{state.totalPoints}</p>
          <p className="muted">
            Zlecenia: {state.marketplacePoints} · Mentoring: {state.communityPoints}
          </p>
        </div>
        {nextLevel && (
          <div className="card">
            <h3>
              Do poziomu {nextLevel.level} ({nextLevel.name})
            </h3>
            <p style={{ fontSize: '1.6rem', margin: 0 }}>brakuje {nextLevel.missingPoints} pkt</p>
            <p className="muted">
              Próg: {nextLevel.pointsRequired} pkt
              {nextLevel.minPathSharePct > 0 &&
                ` · min. ${nextLevel.minPathSharePct}% z każdej ścieżki (zlecenia i mentoring)`}
            </p>
          </div>
        )}
      </section>

      <h2>Historia punktów</h2>
      <p className="muted">
        Pełna transparentność: każdy wpis pokazuje za co, ile i dlaczego z taką wagą. Punkty
        zaliczają się do awansu po 7-dniowej karencji. Zasady: ruleset {state.rulesetVersion} —{' '}
        <Link href="/drabinka">zobacz pełne reguły</Link>.
      </p>
      {events.length === 0 ? (
        <p className="muted">
          Nie masz jeszcze punktów. Zrealizuj i odbierz ocenę za zlecenie z{' '}
          <Link href="/zlecenia">marketplace'u</Link> — to jedna z dwóch dróg awansu.
        </p>
      ) : (
        events.map((event) => (
          <div key={event.id} className="list-row">
            <div>
              <strong>{TYPE_LABELS[event.type] ?? event.type}</strong>
              <div className="meta">
                {event.meta?.explanation ?? ''} ·{' '}
                {new Date(event.createdAt).toLocaleDateString('pl-PL')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>{event.points > 0 ? `+${event.points}` : event.points} pkt</strong>{' '}
              <span className="badge">{STATUS_LABELS[event.status] ?? event.status}</span>
            </div>
          </div>
        ))
      )}
    </main>
  );
}

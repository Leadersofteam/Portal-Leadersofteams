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

interface LevelRow {
  level: number;
  name: string;
  unlocksAppAccess: boolean;
  unlocksTeamCreation: boolean;
}

export default async function MyPointsPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  // Poziomy równolegle z drabinką — progi nagród czytamy z definicji poziomów
  // (unlocksAppAccess/unlocksTeamCreation), nie z liczb zaszytych w widoku.
  const [data, levelsData] = await Promise.all([
    serverApi<LadderData>('/me/ladder'),
    serverApi<{ levels: LevelRow[] }>('/ladder/levels'),
  ]);
  if (!data) redirect('/logowanie');
  const { state, nextLevel, events } = data;

  const levels = levelsData?.levels ?? [];
  const progAppAccess = levels.find((l) => l.unlocksAppAccess)?.level ?? null;
  const progTeam = levels.find((l) => l.unlocksTeamCreation)?.level ?? null;
  const maAppAccess = progAppAccess !== null && state.level >= progAppAccess;
  const maTeam = progTeam !== null && state.level >= progTeam;

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link> · <Link href="/drabinka">Zasady punktacji</Link>
      </div>
      <h1>Moje punkty — Drabinka Lidera</h1>

      <section className="feature-grid">
        <div className="card">
          <h3>Poziom</h3>
          <p className="stat-number">
            {state.level}
            {state.levelName ? ` — ${state.levelName}` : ''}
          </p>
          <p className="muted">
            {state.isLeader ? 'Masz tytuł Lidera' : 'Tytuł Lidera od poziomu 1'}
          </p>
        </div>
        <div className="card">
          <h3>Punkty zaliczone</h3>
          <p className="stat-number">{state.totalPoints}</p>
          <p className="muted">
            Zlecenia: {state.marketplacePoints} · Mentoring: {state.communityPoints}
          </p>
        </div>
        {nextLevel && (
          <div className="card">
            <h3>
              Do poziomu {nextLevel.level} ({nextLevel.name})
            </h3>
            <p className="stat-number">brakuje {nextLevel.missingPoints} pkt</p>
            <p className="muted">
              Próg: {nextLevel.pointsRequired} pkt
              {nextLevel.minPathSharePct > 0 &&
                ` · min. ${nextLevel.minPathSharePct}% z każdej ścieżki (zlecenia i mentoring)`}
            </p>
          </div>
        )}
      </section>

      {/* Nagroda poziomów z unlocksAppAccess (brief założycielski, decyzja
          właściciela 22.08): zdobyty dostęp do aplikacji LOT pokazujemy TUTAJ,
          bo tu prowadzi powiadomienie o awansie. Czysto informacyjny unlock —
          zero zdarzeń, zero punktów (ADR-004 nietknięty). */}
      {maAppAccess && (
        <section className="card reward-card">
          <h2>🏔 Nagroda odblokowana: aplikacja LOT</h2>
          <p>
            Poziom {progAppAccess} otwiera Ci dostęp do <strong>aplikacji LOT</strong> — CRM-u, w
            którym zespoły prowadzą leady, wyceny i zadania. To narzędzie pracy, nie odznaka:{' '}
            {maTeam
              ? 'jako Architekt Zespołów zakładasz w nim WŁASNY zespół i prowadzisz go od pierwszego leada.'
              : `konto zakładasz od ręki, a na poziomie ${progTeam ?? 7} poprowadzisz w nim własny zespół.`}
          </p>
          <p>
            <a
              className="btn"
              href="https://app.leadersofteams.com/register"
              target="_blank"
              rel="noopener noreferrer"
            >
              {maTeam ? 'Załóż swój zespół w LOT →' : 'Wejdź do aplikacji LOT →'}
            </a>
          </p>
        </section>
      )}
      {!maAppAccess && progAppAccess !== null && nextLevel && (
        <p className="muted">
          Na poziomie {progAppAccess} czeka nagroda: dostęp do aplikacji LOT —{' '}
          <Link href="/drabinka">zobacz, co odblokowują poziomy</Link>.
        </p>
      )}

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
          <div key={event.id} className="list-row list-row--stack">
            <div>
              <strong>{TYPE_LABELS[event.type] ?? event.type}</strong>
              <div className="meta">
                {event.meta?.explanation ?? ''} ·{' '}
                {new Date(event.createdAt).toLocaleDateString('pl-PL')}
              </div>
            </div>
            <div className="text-right list-row-aside">
              <strong>{event.points > 0 ? `+${event.points}` : event.points} pkt</strong>{' '}
              <span className="badge">{STATUS_LABELS[event.status] ?? event.status}</span>
            </div>
          </div>
        ))
      )}
    </main>
  );
}

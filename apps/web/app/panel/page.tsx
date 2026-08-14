import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { SessionUser } from '@lot/contracts';

import { ProgressRail } from '@/components/ui/progress-rail';
import { StartHere, type StartStep } from '@/components/ui/start-here';
import { serverApi } from '@/lib/server-api';

import { LogoutButton } from './logout-button';
import { VerifyBanner } from './verify-banner';

export const metadata = { title: 'Baza wspinacza — Leaders of Teams' };

export default async function PanelPage() {
  const me = await serverApi<{ user: SessionUser | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');
  const user = me.user;

  // Stan checklisty liczymy TUTAJ, z istniejących endpointów. Agregat po
  // stronie API musiałby czytać tabele czterech modułów naraz i złamałby
  // granice z ADR-002 — a /me/onboarding trzyma wyłącznie stan własny usera.
  const [profile, companies, ladder, listings, onboarding] = await Promise.all([
    serverApi<{ profile: { id: string; headline: string } | null }>('/me/leader-profile'),
    serverApi<{ companies: Array<{ id: string; name: string }> }>('/me/companies'),
    serverApi<{
      state: {
        level: number;
        levelName: string | null;
        totalPoints: number;
        marketplacePoints: number;
        communityPoints: number;
      };
      nextLevel: {
        level: number;
        name: string;
        pointsRequired: number;
        missingPoints: number;
      } | null;
    }>('/me/ladder'),
    serverApi<{ listings: Array<{ id: string }> }>('/me/listings'),
    serverApi<{ checklistDismissedAt: string | null }>('/me/onboarding'),
  ]);

  // Do S12 NIE BYŁO w całej aplikacji ani jednego linku do /panel/moderacja —
  // moderator musiał znać adres na pamięć. Zgłoszenie mogło więc czekać
  // tygodniami nie dlatego, że ktoś je zignorował, tylko dlatego, że nie miał
  // jak się o nim dowiedzieć. Licznik otwartych spraw jest tu po to, żeby
  // wejście do moderacji było widoczne BEZ wchodzenia w moderację.
  const isModerator = ['MODERATOR', 'ADMIN'].includes(user.role);
  const moderation = isModerator
    ? await serverApi<{ cases: Array<{ id: string }> }>('/moderation/cases?status=OPEN')
    : null;
  const openCases = moderation?.cases?.length ?? 0;

  const hasProfile = Boolean(profile?.profile);
  const hasCompany = Boolean(companies?.companies?.length);
  const hasListing = Boolean(listings?.listings?.length);
  const points = ladder?.state.totalPoints ?? 0;

  const steps: StartStep[] = [
    {
      done: hasProfile,
      label: 'Uzupełnij profil Lidera',
      hint: 'Branża i jedno zdanie o tym, w czym jesteś dobry',
      href: '/panel/profil',
    },
    {
      done: hasListing,
      label: 'Opublikuj pierwszą usługę',
      hint: 'Pakiety i widełki — Firmy szukają konkretów',
      href: '/uslugi/nowa',
    },
    {
      done: hasCompany,
      label: 'Albo dodaj profil firmy',
      hint: 'Jeśli chcesz zlecać pracę, a nie ją wykonywać',
      href: '/firma/nowa',
    },
    {
      done: points > 0,
      label: 'Zdobądź pierwszy szczebel',
      hint: 'Zrealizowane zlecenie albo uznana odpowiedź w pytaniach grupy',
      href: '/grupy',
    },
  ];

  // Checklista tylko dla tych, którzy naprawdę są na starcie — i tylko dopóki
  // sami jej nie schowają.
  const showChecklist = !onboarding?.checklistDismissedAt && points === 0;

  return (
    <main>
      <section className="climber-base">
        <div className="climber-base-head">
          <p className="climber-kicker">Baza wspinacza</p>
          <h1>Cześć, {user.displayName}</h1>
          <p className="muted">{user.email}</p>
        </div>

        {ladder && (
          <ProgressRail
            level={ladder.state.level}
            totalPoints={ladder.state.totalPoints}
            marketplacePoints={ladder.state.marketplacePoints}
            communityPoints={ladder.state.communityPoints}
            nextLevel={ladder.nextLevel}
          />
        )}
      </section>

      <VerifyBanner />

      {showChecklist && <StartHere steps={steps} />}

      <nav className="panel-nav">
        <Link className="btn secondary" href="/panel/profil">
          Profil Lidera
        </Link>
        <Link className="btn secondary" href="/panel/uslugi">
          Moje usługi
        </Link>
        <Link className="btn secondary" href="/panel/oferty">
          Moje oferty
        </Link>
        <Link className="btn secondary" href="/panel/zlecenia">
          Zlecenia firmy
        </Link>
        <Link className="btn secondary" href="/panel/zapisane">
          Zapisane
        </Link>
        <Link className="btn" href="/zlecenia/nowe">
          + Nowe zlecenie
        </Link>
      </nav>

      <section className="feature-grid panel-cards">
        <div className="card" data-ghost="01">
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
        <div className="card" data-ghost="02">
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
        <div className="card" data-ghost="03">
          <h3>Drabinka Lidera</h3>
          <p>
            {points} pkt zaliczonych
            {ladder?.nextLevel
              ? ` · do poziomu ${ladder.nextLevel.level} brakuje ${ladder.nextLevel.missingPoints} pkt`
              : ''}
            . <Link href="/panel/punkty">Moje punkty →</Link>
          </p>
        </div>
      </section>

      {isModerator && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Moderacja</h3>
          <p className="muted">
            {openCases === 0
              ? 'Brak otwartych spraw.'
              : `Otwarte sprawy: ${openCases} — czekają na decyzję człowieka.`}
          </p>
          <nav className="actions-row">
            <Link className={openCases > 0 ? 'btn' : 'btn secondary'} href="/panel/moderacja">
              Zgłoszenia i sygnały{openCases > 0 ? ` (${openCases})` : ''}
            </Link>
            <Link className="btn secondary" href="/panel/analityka">
              Ruch w portalu
            </Link>
          </nav>
        </section>
      )}

      <p className="mt-4">
        <LogoutButton />
      </p>
    </main>
  );
}

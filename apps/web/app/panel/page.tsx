import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { SessionUser } from '@lot/contracts';

import { ProgressRail } from '@/components/ui/progress-rail';
import { StartHere, type StartStep } from '@/components/ui/start-here';
import { ORDER_STATUS_LABELS } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { LogoutButton } from './logout-button';
import { VerifyBanner } from './verify-banner';

export const metadata = { title: 'Panel — Leaders of Teams' };

interface MyOrder {
  id: string;
  title: string;
  status: string;
  industry: string;
  offersCount: number;
  companyName: string;
}

export default async function PanelPage() {
  const me = await serverApi<{ user: SessionUser | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');
  const user = me.user;

  // Stan checklisty liczymy TUTAJ, z istniejących endpointów. Agregat po
  // stronie API musiałby czytać tabele czterech modułów naraz i złamałby
  // granice z ADR-002 — a /me/onboarding trzyma wyłącznie stan własny usera.
  const [profile, companies, ladder, listings, onboarding, social] = await Promise.all([
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
    serverApi<{ checklistDismissedAt: string | null; intent: string | null }>('/me/onboarding'),
    // `/me/social` też było trasą bez wejścia w UI (S18). Skutek był drobny,
    // ale absurdalny: wzmianki `@handle` działały, a użytkownik nie miał jak
    // poznać WŁASNEGO uchwytu ani trafić na swój publiczny profil.
    serverApi<{ handle: string; followers: number; following: number }>('/me/social'),
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

  // Fala 2 (21.10, decyzja właściciela): panel zależy od roli. Konto założone
  // z „Dodaj zlecenie" (intencja COMPANY) albo firma bez profilu Lidera widziała
  // „Bazę wspinacza" i „Jesteś u podnóża" — a o własnym szkicu zlecenia ani
  // słowa. Firma dostaje swój panel; Drabinka zostaje dla Liderów (i dla „BOTH").
  const isCompanyPanel =
    !hasProfile &&
    (onboarding?.intent === 'COMPANY' || (hasCompany && onboarding?.intent !== 'LEADER'));
  if (isCompanyPanel && !isModerator) {
    return (
      <CompanyPanel
        user={user}
        companies={companies?.companies ?? []}
        handle={social?.handle ?? null}
      />
    );
  }

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
          <p className="climber-kicker">Panel Lidera · Baza wspinacza</p>
          <h1>Cześć, {user.displayName}</h1>
          <p className="muted">{user.email}</p>
          {social?.handle && (
            <p className="muted">
              Twój uchwyt: <Link href={`/profil/${social.handle}`}>@{social.handle}</Link> ·{' '}
              {social.followers} obserwujących · obserwujesz {social.following}
            </p>
          )}
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

      {/* Panel-nav świadomy persony (24.08): przyciski ZARZĄDZANIA pokazujemy
          tylko, gdy jest czym zarządzać — „Moje usługi/oferty" dla Lidera
          z profilem, „Zlecenia firmy" dla kogoś z firmą. Bez tego prowadziły
          do pustych ekranów. Ścieżki utworzenia profilu/firmy są w sekcjach
          „Strona Lidera"/„Strona Firmy" niżej, a „Dodaj zlecenie" w pasku „+",
          więc zdublowane „+ Nowe zlecenie" znika stąd. */}
      <nav className="panel-nav">
        <Link className="btn secondary" href="/panel/profil">
          {hasProfile ? 'Profil Lidera' : 'Zostań Liderem'}
        </Link>
        {hasProfile && (
          <Link className="btn secondary" href="/panel/uslugi">
            Moje usługi
          </Link>
        )}
        {hasProfile && (
          <Link className="btn secondary" href="/panel/oferty">
            Moje oferty
          </Link>
        )}
        {hasCompany && (
          <Link className="btn secondary" href="/panel/zlecenia">
            Zlecenia firmy
          </Link>
        )}
        <Link className="btn secondary" href="/panel/zapisane">
          Zapisane
        </Link>
        <Link className="btn secondary" href="/panel/ulubione">
          Ulubione usługi
        </Link>
        <Link className="btn secondary" href="/panel/konto">
          Konto i dane
        </Link>
        {/* PL5: zaproszenie bez cienia MLM — 0 punktów, 0 nagrody, 0 zapisu
            „kto kogo". Tylko mail od człowieka do człowieka. */}
        <Link className="btn secondary" href="/panel/zapros">
          Zaproś Lidera
        </Link>
      </nav>

      <section className="feature-grid panel-cards">
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
            {/* Nadanie roli moderatora wymagało do 19.08 SQL-a na produkcji —
                strona bez wejścia z panelu powtórzyłaby minę „trasa bez UI". */}
            {user.role === 'ADMIN' && (
              <Link className="btn secondary" href="/panel/uzytkownicy">
                Użytkownicy i role
              </Link>
            )}
          </nav>
        </section>
      )}

      <p className="mt-4">
        <LogoutButton />
      </p>
    </main>
  );
}

// Panel Firmy: najpierw JEDEN następny krok wyliczony ze stanu zleceń, potem
// lista zleceń. Weryfikację e-maila czytamy z API przy każdym wejściu (nie
// z migawki sesji — ta sama pułapka co w VerifyBanner).
async function CompanyPanel({
  user,
  companies,
  handle,
}: {
  user: SessionUser;
  companies: Array<{ id: string; name: string }>;
  handle: string | null;
}) {
  const [ordersData, verification] = await Promise.all([
    serverApi<{ orders: MyOrder[] }>('/me/orders'),
    serverApi<{ email: string; verified: boolean } | null>('/me/verification'),
  ]);
  const orders = ordersData?.orders ?? [];
  const verified = verification?.verified ?? true;
  const draft = orders.find((o) => o.status === 'DRAFT');
  const withOffers = orders.find((o) => o.status === 'PUBLISHED' && o.offersCount > 0);
  const open = orders.find((o) => o.status === 'PUBLISHED');

  let step: { title: string; body: string; cta: string; href: string };
  if (withOffers) {
    step = {
      title: `Masz oferty na „${withOffers.title}”`,
      body: `Ofert: ${withOffers.offersCount}. Przy każdej widzisz poziom Lidera i oceny innych firm — dopytaj w rozmowie przy ofercie, zanim wybierzesz.`,
      cta: 'Zobacz oferty',
      href: `/zlecenia/${withOffers.id}`,
    };
  } else if (draft && !verified) {
    step = {
      title: `Twoje zlecenie „${draft.title}” czeka na publikację`,
      body: `Zostało potwierdzenie adresu e-mail — link wysłaliśmy na ${verification?.email ?? user.email}. Po kliknięciu opublikujesz zlecenie jednym przyciskiem, a Liderzy zaczną składać oferty.`,
      cta: 'Otwórz szkic zlecenia',
      href: `/zlecenia/${draft.id}`,
    };
  } else if (draft) {
    step = {
      title: `Opublikuj zlecenie „${draft.title}”`,
      body: 'Szkic jest gotowy. Sprawdź treść i opublikuj — od tej chwili Liderzy mogą składać oferty, a o każdej dostaniesz e-mail.',
      cta: 'Przejrzyj i opublikuj',
      href: `/zlecenia/${draft.id}`,
    };
  } else if (open) {
    step = {
      title: `„${open.title}” czeka na oferty`,
      body: 'Zlecenie jest otwarte. O nowej ofercie dostaniesz e-mail — w międzyczasie możesz przejrzeć gotowe usługi Liderów z tej branży.',
      cta: 'Zobacz zlecenie',
      href: `/zlecenia/${open.id}`,
    };
  } else {
    step = {
      title: 'Dodaj pierwsze zlecenie',
      body: 'Opisz, co ma powstać, i podaj widełki budżetu. Oferty złożą Liderzy z jawnym poziomem i ocenami.',
      cta: 'Dodaj zlecenie',
      href: '/zlecenia/nowe',
    };
  }

  return (
    <main>
      <header className="panel-head">
        <p className="climber-kicker">Panel firmy</p>
        <h1>Cześć, {user.displayName}</h1>
        <p className="muted">
          {companies.length > 0 ? companies.map((c) => c.name).join(', ') : user.email}
          {handle && (
            <>
              {' · '}
              <Link href={`/profil/${handle}`}>@{handle}</Link>
            </>
          )}
        </p>
      </header>

      <section className="next-step" aria-labelledby="next-step-title">
        <span className="section-eyebrow">Następny krok</span>
        <h2 id="next-step-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="actions-row">
          <Link className="btn" href={step.href}>
            {step.cta}
          </Link>
          {step.href !== '/zlecenia/nowe' && (
            <Link className="btn secondary" href="/zlecenia/nowe">
              Dodaj kolejne zlecenie
            </Link>
          )}
        </div>
      </section>

      {/* Gdy krok już mówi o potwierdzeniu adresu, baner byłby drugim akapitem
          o tym samym — ponowną wysyłkę ma strona szkicu (fala 1, P04). */}
      {!(draft && !verified) && <VerifyBanner />}

      {orders.length > 0 && (
        <section className="panel-section">
          <h2>Twoje zlecenia</h2>
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} className="list-row list-row--stack">
              <div>
                <h3>
                  <Link href={`/zlecenia/${order.id}`}>{order.title}</Link>
                </h3>
                <div className="meta">
                  {order.industry} · ofert: {order.offersCount}
                </div>
              </div>
              <span className="badge list-row-aside">
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
          ))}
          {orders.length > 5 && (
            <p className="mt-2">
              <Link href="/panel/zlecenia">Wszystkie zlecenia firmy →</Link>
            </p>
          )}
        </section>
      )}

      <nav className="panel-nav panel-section" aria-label="Panel firmy">
        <Link className="btn secondary" href="/panel/zlecenia">
          Zlecenia firmy
        </Link>
        <Link className="btn secondary" href="/uslugi">
          Gotowe usługi
        </Link>
        <Link className="btn secondary" href="/panel/zapisane">
          Zapisane
        </Link>
        <Link className="btn secondary" href="/panel/konto">
          Konto i dane
        </Link>
      </nav>

      <p className="muted mt-2">
        Chcesz też wykonywać zlecenia? <Link href="/panel/profil">Załóż profil Lidera →</Link>
      </p>

      <p className="mt-4">
        <LogoutButton />
      </p>
    </main>
  );
}

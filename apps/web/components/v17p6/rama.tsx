'use client';

// Rama publicznych ekranów V17 (P6 + P5): górny pasek jak components/site-header.tsx, dolny pasek jak
// components/bottom-nav.tsx (te same sloty), stopka jak components/ui/footer.tsx. Port z pro/publiczne.js.
// Globalne odpowiedniki z root layoutu chowa CSS (`body:has(.v17)`, v17-swiatlo.css).
// Świadomie `div role="main"`, nie <main>: reguły `main …` z globals.css przebijałyby styl makiety.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { NotificationCountBadge } from '@/components/notification-bell';
import { FooterAccountLinks } from '@/components/ui/footer-account-links';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Ico } from '@/components/v17/ico';
import type { IcoName } from '@/components/v17/ico';
import { Znak } from '@/components/v17/rama';
import { TloSiec } from '@/components/v17/tlo-siec';
import { ECOSYSTEM_OTHERS } from '@/lib/ecosystem';
import { useSession } from '@/lib/use-session';
import { useDialog } from '@/lib/use-dialog';

type Pozycja = [string, string];
const NAV: Pozycja[] = [
  ['/feed', 'Feed'],
  ['/uslugi', 'Usługi'],
  ['/zlecenia', 'Zlecenia'],
  ['/liderzy', 'Liderzy'],
  ['/grupy', 'Grupy'],
];
const GOSC: Pozycja[] = [['/dla-firm', 'Dla firm']];
const KONTO: Pozycja[] = [
  ['/droga', 'Droga'],
  ['/panel', 'Panel'],
];

function Marka() {
  return (
    <Link className="znak" href="/">
      <Znak />
      <span>Leaders of Teams</span>
    </Link>
  );
}

// Zwykły formularz GET — działa bez JS (jak components/global-search.tsx).
function Szukaj({ id }: { id: string }) {
  return (
    <form className="pg-szukaj" role="search" action="/szukaj" method="get">
      <Ico n="magnifying-glass" />
      <label className="sr" htmlFor={id}>
        Szukaj w Portalu
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Szukaj usług, Liderów, zleceń…"
        maxLength={80}
        autoComplete="off"
      />
    </form>
  );
}

const TWORZ: Array<[IcoName, string, string, string]> = [
  ['pencil-simple', '/feed#composer', 'Napisz wpis', 'Krótka notka do obserwujących'],
  ['storefront', '/uslugi/nowa', 'Opublikuj usługę', 'Twoje umiejętności z pakietami i ceną'],
  [
    'clipboard-text',
    '/zlecenia/nowe',
    'Dodaj zlecenie',
    'Opisz, czego potrzebujesz — Liderzy złożą oferty',
  ],
];

function Arkusz({ zamknij }: { zamknij: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, true, zamknij);
  // Powyżej progu telefonu arkusz znika w CSS — musi też oddać fokus i przewijanie.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 721px)');
    const zmiana = () => mq.matches && zamknij();
    mq.addEventListener('change', zmiana);
    return () => mq.removeEventListener('change', zmiana);
  }, [zamknij]);
  return (
    <>
      <div className="zaslona zaslona-arkusz" onClick={zamknij} />
      <div
        ref={ref}
        className="arkusz"
        role="dialog"
        aria-modal="true"
        aria-labelledby="co-tworzysz"
      >
        <h2 id="co-tworzysz">Co dziś tworzysz?</h2>
        {TWORZ.map(([ik, href, t, h]) => (
          <Link key={href} href={href} onClick={zamknij}>
            <span className="ico">
              <Ico n={ik} />
            </span>
            <span>
              <strong>{t}</strong>
              <small>{h}</small>
            </span>
          </Link>
        ))}
        <button className="vbtn obrys pelny" type="button" onClick={zamknij}>
          Zamknij
        </button>
      </div>
    </>
  );
}

export function RamaPubliczna({
  children,
  landing = false,
}: {
  children: ReactNode;
  /** Strona główna ma na dużym ekranie własne rozmiary zamiast zoomu. */
  landing?: boolean;
}) {
  // Przy prerenderze ścieżka to cel rewrite'u (/v17p6/…), w przeglądarce adres publiczny — porównujemy bez prefiksu.
  const pathname = usePathname().replace(/^\/v17p6(?=\/|$)/, '') || '/';
  const { user } = useSession();
  const [menu, setMenu] = useState(false);
  const [arkusz, setArkusz] = useState(false);
  const przyciskMenu = useRef<HTMLButtonElement>(null);
  const linki = [...NAV, ...(user ? KONTO : user === null ? GOSC : [])];
  const tu = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const aktualna = (href: string) => (tu(href) ? ('page' as const) : undefined);

  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenu(false);
      przyciskMenu.current?.focus();
    };
    // Fokus wychodzący pod zasłonę zamyka menu (X w pasku zostaje częścią menu).
    const poza = (e: FocusEvent) => {
      if (!(e.target as Element).closest?.('.pg-tel, .menu-tel')) setMenu(false);
    };
    window.addEventListener('keydown', esc);
    document.addEventListener('focusin', poza);
    return () => {
      window.removeEventListener('keydown', esc);
      document.removeEventListener('focusin', poza);
    };
  }, [menu]);
  useEffect(() => setMenu(false), [pathname]);

  // Póki sesja nieznana (`undefined`, także w prerenderze) dolny pasek pokazuje wariant gościa — jak bottom-nav.tsx.
  const dol: Array<[string, string, IcoName]> = user
    ? [
        ['/powiadomienia', 'Powiadomienia', 'bell'],
        ['/panel', 'Panel', 'squares-four'],
      ]
    : [
        ['/dla-firm', 'Dla firm', 'clipboard-text'],
        ['/logowanie', 'Zaloguj', 'sign-in'],
      ];
  const slot = ([href, t, ik]: [string, string, IcoName]) => (
    <Link key={href} href={href} aria-current={aktualna(href)}>
      <span className="slot-ico">
        <Ico n={ik} />
        {href === '/powiadomienia' && <NotificationCountBadge />}
      </span>
      <span>{t}</span>
    </Link>
  );

  return (
    <div className={`v17 v17p${landing ? ' v17p-landing' : ''}`}>
      <TloSiec />
      <a className="sr" href="#tresc">
        Przejdź do treści
      </a>
      <div className="strona-tel">
        <header className="pg">
          <div className="pg-w">
            <Marka />
            <Szukaj id="p6-q" />
            <nav className="pg-linki" aria-label="Nawigacja główna">
              {linki.map(([href, t]) => (
                <Link key={href} href={href} aria-current={aktualna(href)}>
                  {t}
                </Link>
              ))}
              {user && (
                <>
                  <Link className="ikonka" href="/powiadomienia" aria-label="Powiadomienia">
                    <Ico n="bell" />
                    <NotificationCountBadge />
                  </Link>
                  <Link className="vbtn obrys" href="/panel">
                    {user.displayName.split(' ')[0]}
                  </Link>
                </>
              )}
              {user === null && (
                <>
                  <Link href="/logowanie">Zaloguj się</Link>
                  <Link className="vbtn obrys" href="/rejestracja">
                    Dołącz
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <header className="pg-tel">
          <Marka />
          {user && (
            <Link className="ikonka" href="/powiadomienia" aria-label="Powiadomienia">
              <Ico n="bell" />
              <NotificationCountBadge />
            </Link>
          )}
          <button
            ref={przyciskMenu}
            className="ikonka"
            type="button"
            aria-label="Menu"
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            <Ico n={menu ? 'x' : 'list'} />
          </button>
          <Szukaj id="p6-q-tel" />
        </header>
        {menu && (
          <>
            <div className="zaslona zaslona-menu" onClick={() => setMenu(false)} />
            <nav className="menu-tel" aria-label="Menu">
              {linki.map(([href, t]) => (
                <Link key={href} href={href} onClick={() => setMenu(false)}>
                  {t}
                </Link>
              ))}
              {user && (
                <Link href="/powiadomienia" onClick={() => setMenu(false)}>
                  Powiadomienia
                </Link>
              )}
              <div className="akcje-k">
                {user && (
                  <Link className="vbtn obrys" href="/panel" onClick={() => setMenu(false)}>
                    {user.displayName.split(' ')[0]}
                  </Link>
                )}
                {user === null && (
                  <>
                    <Link className="vbtn obrys" href="/logowanie" onClick={() => setMenu(false)}>
                      Zaloguj się
                    </Link>
                    <Link
                      className="vbtn glowny"
                      href="/rejestracja"
                      onClick={() => setMenu(false)}
                    >
                      Dołącz
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </>
        )}
        <div className="pm" role="main" id="tresc">
          {children}
        </div>
        <Stopka />
      </div>
      <nav className="dolny" aria-label="Nawigacja dolna">
        {slot(['/feed', 'Feed', 'house-simple'])}
        {slot(['/uslugi', 'Usługi', 'storefront'])}
        <button type="button" aria-haspopup="dialog" onClick={() => setArkusz(true)}>
          <span className="slot-ico">
            <Ico n="plus-circle" />
          </span>
          <span>Utwórz</span>
        </button>
        {dol.map(slot)}
      </nav>
      {arkusz && <Arkusz zamknij={() => setArkusz(false)} />}
    </div>
  );
}

function Stopka() {
  const kolumna = (naglowek: string, pozycje: Pozycja[]) => (
    <div>
      <h4>{naglowek}</h4>
      <ul>
        {pozycje.map(([href, t]) => (
          <li key={href}>
            <Link href={href}>{t}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="p-st">
      <div className="st-w">
        <div>
          <Marka />
          <p>
            Status, którego nie da się kupić ani wyrekrutować — tylko zapracować. Marketplace B2B i
            społeczność Liderów z jawnym, antymanipulacyjnym systemem awansu.
          </p>
          <ThemeToggle />
        </div>
        {kolumna('Platforma', [
          ['/uslugi', 'Usługi Liderów'],
          ['/zlecenia', 'Zlecenia'],
          ['/liderzy', 'Liderzy'],
          ['/grupy', 'Grupy branżowe'],
          ['/droga', 'Droga Lidera'],
          ['/drabinka', 'Zasady punktacji'],
          ['/dla-firm', 'Dla firm'],
        ])}
        <div>
          <h4>Ekosystem</h4>
          <ul>
            {ECOSYSTEM_OTHERS.map((l) => (
              <li key={l.href}>
                <a href={l.href} title={l.description} hrefLang={l.lang}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Konto i zasady</h4>
          <ul>
            <FooterAccountLinks />
            <li>
              <Link href="/regulamin">Regulamin</Link>
            </li>
            <li>
              <Link href="/prywatnosc">Polityka prywatności</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="st-prawne">
        © {new Date().getFullYear()} Leaders of Teams · leadersofteams.pl
      </div>
    </footer>
  );
}

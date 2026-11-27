// Rama ekranów V17 „Światło” (x.com): lewa nawigacja, górny pasek i dolny pasek na telefonie, stopka.
// Port z pro.js (nav/gora/dolny/stopka). Linki są prawdziwymi trasami Portalu, nie plikami makiety.
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ECOSYSTEM_OTHERS } from '@/lib/ecosystem';

import { Ico } from './ico';
import type { IcoName } from './ico';
import { KontoMenu, KontoWyzwalacz } from './konto';
import { TloSiec } from './tlo-siec';
import { Aw, Odznaka } from './znaki';

export interface Ja {
  name: string;
  level: number;
  handle: string | null;
  avatarFileId: string | null;
  /** Widok firmy (tylko ekrany, które to ustawią): kwadratowe logo i „Konto firmy” zamiast osoby ze szczeblem. */
  firma?: { nazwa: string; branza: string };
}

export type MenuKlucz =
  | 'feed'
  | 'zlecenia'
  | 'uslugi'
  | 'pytania'
  | 'liderzy'
  | 'drabinka'
  | 'powiadomienia'
  | 'profil'
  | '';

const MENU: Array<[Exclude<MenuKlucz, ''>, string, IcoName, string]> = [
  ['feed', 'Strumień', 'house-simple', '/feed'],
  ['zlecenia', 'Zlecenia', 'clipboard-text', '/zlecenia'],
  ['uslugi', 'Usługi', 'storefront', '/uslugi'],
  ['pytania', 'Pytania', 'chats-circle', '/pytania'],
  ['liderzy', 'Liderzy', 'users-three', '/liderzy'],
  ['drabinka', 'Drabinka', 'ladder', '/drabinka'],
  ['powiadomienia', 'Powiadomienia', 'bell', '/powiadomienia'],
  ['profil', 'Profil', 'user-circle', '/panel'],
];
const DOLNY: Array<[string, string, IcoName, string]> = [
  ['feed', 'Strumień', 'house-simple', '/feed'],
  ['zlecenia', 'Zlecenia', 'clipboard-text', '/zlecenia'],
  ['uslugi', 'Usługi', 'storefront', '/uslugi'],
  ['pytania', 'Pytania', 'chats-circle', '/pytania'],
  ['drabinka', 'Drabinka', 'ladder', '/drabinka'],
];

// Znak sieci: trzy punkty o rosnącej jasności (zasada „punkt nie świeci sam”).
export function Znak() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="5" cy="20" r="3.4" style={{ fill: 'var(--level-2)' }} />
      <circle cx="12.5" cy="12.5" r="4.2" style={{ fill: 'var(--primary-400)' }} />
      <circle cx="20.5" cy="5.5" r="4.6" style={{ fill: 'var(--level-6)' }} />
    </svg>
  );
}

function avatarSrc(id: string | null) {
  return id ? `/api/v1/files/${id}/thumb` : null;
}

function AwatarKonta({ ja, size }: { ja: Ja; size: number }) {
  return ja.firma ? (
    <Aw name={ja.firma.nazwa} size={size} company industry={ja.firma.branza} />
  ) : (
    <Aw name={ja.name} size={size} src={avatarSrc(ja.avatarFileId)} />
  );
}

export function Stopka() {
  return (
    <footer className="stopka">
      <span className="eko">Ekosystem</span>
      {ECOSYSTEM_OTHERS.map((l) => (
        <a key={l.id} href={l.href}>
          {l.label}
        </a>
      ))}
      <Link href="/regulamin">Regulamin</Link>
      <Link href="/prywatnosc">Prywatność</Link>
    </footer>
  );
}

export function Rama({
  aktywny,
  ja,
  szeroka = false,
  offline = false,
  boczna,
  children,
}: {
  aktywny: MenuKlucz;
  /** null = gość; undefined = nieznany (ładowanie/błąd) — wtedy nie pokazujemy zaproszenia do logowania. */
  ja?: Ja | null;
  szeroka?: boolean;
  /** Ekran bez sieci: tworzenie wyłączone. */
  offline?: boolean;
  boczna?: ReactNode;
  children: ReactNode;
}) {
  const profilHref = ja?.handle ? `/profil/${ja.handle}` : '/panel';
  const tresc = (
    <>
      <TloSiec />
      <a className="sr" href="#tresc">
        Przejdź do treści
      </a>
      <header className="gora">
        <Link className="znak" href="/feed">
          <Znak />
          <span>Portal Liderów</span>
        </Link>
        <Link className="ikonka" href="/szukaj" aria-label="Szukaj">
          <Ico n="magnifying-glass" />
        </Link>
        <Link className="ikonka" href="/powiadomienia" aria-label="Powiadomienia">
          <Ico n="bell" />
        </Link>
        {ja ? (
          <KontoWyzwalacz className="konto">
            <AwatarKonta ja={ja} size={36} />
          </KontoWyzwalacz>
        ) : ja === null ? (
          <>
            <Link className="vbtn obrys maly" href="/logowanie">
              Zaloguj się
            </Link>
            <KontoWyzwalacz className="ikonka">
              <Ico n="dots-three" />
            </KontoWyzwalacz>
          </>
        ) : null}
      </header>
      <div className={`rama${szeroka ? ' szeroka' : ''}`}>
        <nav className="nav" aria-label="Nawigacja główna">
          <Link className="znak" href="/feed">
            <Znak />
            <span>Portal Liderów</span>
          </Link>
          <ul>
            {MENU.map(([k, t, ik, href]) => (
              <li key={k}>
                <Link
                  className="poz"
                  href={k === 'profil' ? profilHref : href}
                  aria-current={k === aktywny ? 'page' : undefined}
                  title={t}
                >
                  <Ico n={ik} />
                  <span className="etk">{t}</span>
                </Link>
              </li>
            ))}
          </ul>
          {offline ? (
            <button className="vbtn obrys duzy utworz" type="button" disabled aria-label="Utwórz">
              <Ico n="plus" />
              <span>Utwórz</span>
            </button>
          ) : (
            <Link className="vbtn obrys duzy utworz" href="/zlecenia/nowe" aria-label="Utwórz">
              <Ico n="plus" />
              <span>Utwórz</span>
            </Link>
          )}
          {ja ? (
            <KontoWyzwalacz className="ja">
              <AwatarKonta ja={ja} size={44} />
              <span className="kto">
                <b>{ja.firma ? ja.firma.nazwa : ja.name}</b>
                <small>{ja.firma ? 'Konto firmy' : <Odznaka level={ja.level} />}</small>
              </span>
              <span className="ikonka" aria-hidden="true">
                <Ico n="dots-three" />
              </span>
            </KontoWyzwalacz>
          ) : ja === null ? (
            <KontoWyzwalacz className="ja">
              <span className="gosc-aw" aria-hidden="true">
                <Ico n="user-circle" />
              </span>
              <span className="kto">
                <b>Gość</b>
                <small>Zaloguj się, żeby budować szczebel</small>
              </span>
            </KontoWyzwalacz>
          ) : null}
        </nav>
        <div className="kolumna" id="tresc" role="main">
          {children}
        </div>
        {boczna ?? null}
      </div>
      <nav className="dolny" aria-label="Nawigacja dolna">
        {DOLNY.map(([k, t, ik, href]) => (
          <Link key={k} href={href} aria-current={k === aktywny ? 'page' : undefined}>
            <Ico n={ik} />
            <span>{t}</span>
          </Link>
        ))}
      </nav>
    </>
  );
  // Menu konta MUSI renderować się wewnątrz `.v17` — wszystkie style V17 są pod tym selektorem.
  // ja === undefined (ładowanie, błąd, offline): nie wiemy, kto patrzy — bez menu.
  return (
    <div className="v17">{ja === undefined ? tresc : <KontoMenu ja={ja}>{tresc}</KontoMenu>}</div>
  );
}

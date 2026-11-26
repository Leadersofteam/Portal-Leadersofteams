'use client';

// Menu konta (makieta braki.js: `wiecej`). Otwierają je karta `.ja` w szynie (komputer, także zwinięta)
// i awatar w górnym pasku (telefon). Gość dostaje wariant bez pozycji konta.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { apiFetch } from '@/lib/api';
import { odczytajMotyw, zastosujMotyw, type Motyw } from '@/lib/theme';
import { useDialog } from '@/lib/use-dialog';
import { clearSessionCache } from '@/lib/use-session';

import { Ico } from './ico';
import type { IcoName } from './ico';
import { Aw, Odznaka } from './znaki';

export interface KontoOsoba {
  name: string;
  level: number;
  handle: string | null;
  avatarFileId: string | null;
  firma?: { nazwa: string; branza: string };
}

const Kontekst = createContext<{ otwarte: boolean; otworz: () => void } | null>(null);

export function KontoWyzwalacz({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const k = useContext(Kontekst);
  return (
    <button
      type="button"
      className={`${className} wyzw`}
      aria-haspopup="dialog"
      aria-expanded={k?.otwarte ?? false}
      aria-label="Konto i ustawienia"
      onClick={k?.otworz}
    >
      {children}
    </button>
  );
}

const KONTO: Array<[IcoName, string, string]> = [
  ['gauge', 'Panel', '/panel'],
  ['bookmark-simple', 'Zapisane', '/panel/zapisane'],
  ['list-checks', 'Moje punkty', '/panel/punkty'],
];
const PORTAL: Array<[IcoName, string, string]> = [
  ['users-three', 'Liderzy', '/liderzy'],
  ['users', 'Grupy branżowe', '/grupy'],
  ['footprints', 'Droga Lidera', '/droga'],
  ['buildings', 'Dla firm', '/dla-firm'],
];
const MOTYWY: Array<[Motyw, IcoName, string]> = [
  ['dark', 'moon', 'Ciemny'],
  ['light', 'sun', 'Jasny'],
  ['system', 'desktop', 'Systemowy'],
];

function WyborMotywu() {
  const [motyw, setMotyw] = useState<Motyw>('dark');
  useEffect(() => setMotyw(odczytajMotyw()), []);
  function wybierz(m: Motyw) {
    zastosujMotyw(m);
    setMotyw(m);
  }
  return (
    <div
      className="motyw-wybor"
      role="radiogroup"
      aria-label="Motyw"
      onKeyDown={(e) => {
        const krok =
          e.key === 'ArrowRight' || e.key === 'ArrowDown'
            ? 1
            : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
              ? -1
              : 0;
        if (!krok) return;
        e.preventDefault();
        const i = MOTYWY.findIndex(([k]) => k === motyw);
        const n = (i + krok + MOTYWY.length) % MOTYWY.length;
        wybierz(MOTYWY[n]![0]);
        (e.currentTarget.children[n] as HTMLElement).focus();
      }}
    >
      {MOTYWY.map(([k, ik, t]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={motyw === k}
          tabIndex={motyw === k ? 0 : -1}
          onClick={() => wybierz(k)}
        >
          <Ico n={ik} />
          {t}
        </button>
      ))}
    </div>
  );
}

function Wyloguj() {
  const [pending, setPending] = useState(false);
  async function onClick() {
    setPending(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      // Jak w panel/logout-button: czyścimy migawki (sesja, strumień offline) i robimy TWARDĄ nawigację —
      // router cache trzyma strony z czasów zalogowania.
      clearSessionCache();
      window.location.assign('/');
    }
  }
  return (
    <button type="button" onClick={() => void onClick()} disabled={pending}>
      <Ico n="sign-out" />
      {pending ? 'Wylogowywanie…' : 'Wyloguj się'}
    </button>
  );
}

function Okno({ ja, zamknij }: { ja: KontoOsoba | null; zamknij: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useDialog(ref, true, zamknij);
  const nazwa = ja ? (ja.firma?.nazwa ?? ja.name) : 'Gość';
  const naglowek = <h2 id="v17-konto">{nazwa}</h2>;
  const pozycje = (lista: Array<[IcoName, string, string]>) =>
    lista.map(([ik, t, href]) => (
      <Link key={href} href={href} onClick={zamknij}>
        <Ico n={ik} />
        {t}
      </Link>
    ));
  return (
    <>
      <div className="zaslona" onClick={zamknij} aria-hidden="true" />
      <section
        ref={ref}
        className="wiecej-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="v17-konto"
      >
        <header>
          {ja?.firma ? (
            <Aw name={nazwa} size={44} company industry={ja.firma.branza} />
          ) : ja ? (
            <Aw
              name={ja.name}
              size={44}
              ring
              level={ja.level}
              src={ja.avatarFileId ? `/api/v1/files/${ja.avatarFileId}/thumb` : null}
            />
          ) : null}
          {ja ? (
            <Link
              className="mojprofil"
              href={ja.handle ? `/profil/${ja.handle}` : '/panel'}
              onClick={zamknij}
            >
              {naglowek}
              {ja.firma ? null : <Odznaka level={ja.level} />}
              <small>Mój profil</small>
            </Link>
          ) : (
            <div className="mojprofil">
              {naglowek}
              <span className="gosc">Zaloguj się, żeby budować szczebel</span>
            </div>
          )}
          <button className="ikonka" type="button" aria-label="Zamknij" onClick={zamknij}>
            <Ico n="x" zwykla />
          </button>
        </header>
        {ja ? (
          <nav aria-label="Konto">{pozycje(KONTO)}</nav>
        ) : (
          <nav aria-label="Konto">
            {pozycje([
              ['sign-in', 'Zaloguj się', '/logowanie'],
              ['user-plus', 'Załóż konto', '/rejestracja'],
            ])}
          </nav>
        )}
        <nav aria-label="Portal">{pozycje(PORTAL)}</nav>
        <div className="blok">
          <span className="et">Motyw</span>
          <WyborMotywu />
        </div>
        {ja ? (
          <nav aria-label="Sesja">
            <Wyloguj />
          </nav>
        ) : null}
      </section>
    </>
  );
}

export function KontoMenu({ ja, children }: { ja: KontoOsoba | null; children: ReactNode }) {
  const [otwarte, setOtwarte] = useState(false);
  const sciezka = usePathname();
  // Nawigacja z menu (albo „wstecz” w przeglądarce) zamyka okno.
  useEffect(() => setOtwarte(false), [sciezka]);
  return (
    <Kontekst.Provider value={{ otwarte, otworz: () => setOtwarte(true) }}>
      {children}
      {otwarte ? <Okno ja={ja} zamknij={() => setOtwarte(false)} /> : null}
    </Kontekst.Provider>
  );
}

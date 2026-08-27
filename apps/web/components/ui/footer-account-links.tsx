'use client';

import Link from 'next/link';

import { useSession } from '@/lib/use-session';

/**
 * Linki kontowe stopki — ten sam zastany błąd co D12 w nagłówku: statyczna
 * stopka pokazywała „Załóż konto / Zaloguj się" także zalogowanym, przez co
 * powrót na landing wyglądał jak wylogowanie. Tylko te dwa linki są klienckie;
 * linki prawne (wymóg R-10) zostają w statycznym HTML stopki.
 *
 * `useSession` współdzieli jedno żądanie z nagłówkiem (obietnica na poziomie
 * modułu) — ten komponent nie kosztuje ani jednego dodatkowego strzału do API.
 * `undefined` = jeszcze nie wiadomo: renderujemy pusty slot, bo stopka, która
 * przez pół sekundy kłamie, jest gorsza niż stopka, która pół sekundy milczy
 * (ta sama zasada co w `site-header.tsx`).
 */
export function FooterAccountLinks() {
  const { user } = useSession();

  if (user === undefined) return null;

  if (user === null) {
    return (
      <>
        <li>
          <Link href="/rejestracja">Załóż konto</Link>
        </li>
        <li>
          <Link href="/logowanie">Zaloguj się</Link>
        </li>
      </>
    );
  }

  return (
    <>
      <li>
        <Link href="/panel">Panel</Link>
      </li>
      <li>
        <Link href="/panel/konto">Konto i dane</Link>
      </li>
    </>
  );
}

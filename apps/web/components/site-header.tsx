'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { GlobalSearch } from '@/components/global-search';
import { NotificationBell } from '@/components/notification-bell';
import { LogoMark } from '@/components/ui/logo';
import { useSession } from '@/lib/use-session';

// Pełna nawigacja desktopu. Na mobile pięć najczęstszych miejsc przejmuje
// dolny pasek (components/bottom-nav.tsx), a reszta zostaje pod hamburgerem —
// header ma wtedy nieść tylko markę i wejście w menu.
const NAV_LINKS = [
  { href: '/feed', label: 'Feed' },
  { href: '/uslugi', label: 'Usługi' },
  { href: '/zlecenia', label: 'Zlecenia' },
  { href: '/liderzy', label: 'Liderzy' },
  { href: '/grupy', label: 'Grupy' },
  { href: '/droga', label: 'Droga' },
  { href: '/panel', label: 'Panel' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);
  // ZASTANE do S17: nagłówek NIGDY nie czytał sesji, więc zalogowana osoba na
  // każdej stronie widziała „Zaloguj się / Dołącz". Zgłoszone przy S12.
  const { user } = useSession();

  return (
    <header className="site-header">
      <Link href="/" className="brand" onClick={close}>
        <LogoMark />
        Leaders of Teams
      </Link>

      <GlobalSearch />

      <button
        type="button"
        className="nav-toggle"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav className={open ? 'open' : ''}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'active' : ''
            }
            onClick={close}
          >
            {link.label}
          </Link>
        ))}
        <NotificationBell />
        {/* Dopóki nie wiadomo, kto patrzy (`undefined`), slot zostaje PUSTY.
            Domyślne „Zaloguj się" mignęłoby zalogowanym przy każdym wejściu,
            a nagłówek, który kłamie przez pół sekundy, jest gorszy niż
            nagłówek, który przez pół sekundy milczy. */}
        {user === null && (
          <>
            <Link href="/logowanie" onClick={close}>
              Zaloguj się
            </Link>
            <Link href="/rejestracja" className="btn secondary" onClick={close}>
              Dołącz
            </Link>
          </>
        )}
        {user && (
          <Link href="/panel" className="btn secondary" onClick={close}>
            {user.displayName.split(' ')[0]}
          </Link>
        )}
      </nav>
    </header>
  );
}

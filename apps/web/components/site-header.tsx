'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { NotificationBell } from '@/components/notification-bell';
import { LogoMark } from '@/components/ui/logo';

const NAV_LINKS = [
  { href: '/feed', label: 'Feed' },
  { href: '/uslugi', label: 'Usługi' },
  { href: '/zlecenia', label: 'Zlecenia' },
  { href: '/liderzy', label: 'Liderzy' },
  { href: '/grupy', label: 'Grupy' },
  { href: '/drabinka', label: 'Drabinka' },
  { href: '/panel', label: 'Panel' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <Link href="/" className="brand" onClick={close}>
        <LogoMark />
        Leaders of Teams
      </Link>

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
            className={pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'active' : ''}
            onClick={close}
          >
            {link.label}
          </Link>
        ))}
        <NotificationBell />
        <Link href="/logowanie" onClick={close}>
          Zaloguj się
        </Link>
        <Link href="/rejestracja" className="btn secondary" onClick={close}>
          Dołącz
        </Link>
      </nav>
    </header>
  );
}

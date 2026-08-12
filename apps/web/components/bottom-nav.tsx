'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CreateSheet } from '@/components/create-sheet';
import { NotificationCountBadge } from '@/components/notification-bell';
import { IconBell, IconFeed, IconPanel, IconServices } from '@/components/ui/icons';

/**
 * Kieszonkowa nawigacja (≤768 px) — pięć miejsc pod kciuk.
 *
 * Środkowy slot to akcja twórcza, nie kolejny link: na pustym rynku
 * najważniejsze jest, żeby „opublikuj" było zawsze jedno dotknięcie stąd.
 * Sloty są STAŁE — żaden z nich nie znika dla gościa, bo pasek nawigacyjny,
 * który zmienia liczbę kolumn po hydracji, czyta się jak usterka.
 */
const SLOTS = [
  { href: '/feed', label: 'Feed', Icon: IconFeed },
  { href: '/uslugi', label: 'Usługi', Icon: IconServices },
] as const;

const RIGHT_SLOTS = [
  { href: '/powiadomienia', label: 'Powiadomienia', Icon: IconBell, badge: true },
  { href: '/panel', label: 'Panel', Icon: IconPanel, badge: false },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Nawigacja główna">
      {SLOTS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`bottom-nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} active={active} />
            <span>{label}</span>
          </Link>
        );
      })}

      <CreateSheet />

      {RIGHT_SLOTS.map(({ href, label, Icon, badge }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`bottom-nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">
              <Icon size={22} active={active} />
              {badge && <NotificationCountBadge />}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

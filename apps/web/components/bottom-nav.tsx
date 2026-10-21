'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CreateSheet } from '@/components/create-sheet';
import { NotificationCountBadge } from '@/components/notification-bell';
import {
  IconBell,
  IconFeed,
  IconLogin,
  IconOrders,
  IconPanel,
  IconServices,
} from '@/components/ui/icons';
import { useSession } from '@/lib/use-session';

/**
 * Kieszonkowa nawigacja (≤768 px) — pięć miejsc pod kciuk.
 *
 * Środkowy slot to akcja twórcza, nie kolejny link: na pustym rynku
 * najważniejsze jest, żeby „opublikuj" było zawsze jedno dotknięcie stąd.
 * Sloty są STAŁE — ich LICZBA nie zmienia się dla gościa, bo pasek
 * nawigacyjny, który zmienia liczbę kolumn po hydracji, czyta się jak usterka.
 * Zmienia się TREŚĆ prawych slotów (audyt UX 21.10, P16): gość nie ma
 * powiadomień ani panelu — dostaje „Dla firm" i „Zaloguj". Póki sesja
 * nieznana (`undefined`, także w SSR) — wariant gościa: strony są
 * prerenderowane, a gość to większość ruchu.
 */
const SLOTS = [
  { href: '/feed', label: 'Feed', Icon: IconFeed },
  { href: '/uslugi', label: 'Usługi', Icon: IconServices },
] as const;

const RIGHT_SLOTS = [
  { href: '/powiadomienia', label: 'Powiadomienia', Icon: IconBell, badge: true },
  { href: '/panel', label: 'Panel', Icon: IconPanel, badge: false },
] as const;

const GUEST_RIGHT_SLOTS = [
  { href: '/dla-firm', label: 'Dla firm', Icon: IconOrders, badge: false },
  { href: '/logowanie', label: 'Zaloguj', Icon: IconLogin, badge: false },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useSession();
  const rightSlots = user ? RIGHT_SLOTS : GUEST_RIGHT_SLOTS;

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

      {rightSlots.map(({ href, label, Icon, badge }) => {
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

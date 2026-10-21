'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

import { IconBell } from '@/components/ui/icons';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { useSession } from '@/lib/use-session';

// Dzwonek powiadomień: badge liczby nieprzeczytanych + realtime (ADR-007).
// Socket niesie tylko SYGNAŁ „coś przyszło" — licznik zawsze dociągany REST-em.
// Path /api/socket.io/ jedzie tym samym same-origin rewrite co REST (cookies
// sesyjne), z fallbackiem do long-pollingu za restrykcyjnym proxy.

type UnreadState = { count: number | null; authed: boolean };

// JEDNO gniazdo na kartę, współdzielone przez dzwonek i badge dolnego paska.
// Zastane do 21.10: komentarz niżej obiecywał jedno źródło, a każdy komponent
// otwierał własne `io()` — zmierzone 2 WebSockety na stronę po zalogowaniu.
let sharedSocket: Socket | null = null;
const socketListeners = new Set<() => void>();

function subscribeNotifications(listener: () => void): () => void {
  socketListeners.add(listener);
  if (!sharedSocket) {
    sharedSocket = io({ path: '/api/socket.io/', withCredentials: true });
    sharedSocket.on('notification', () => socketListeners.forEach((l) => l()));
  }
  return () => {
    socketListeners.delete(listener);
    if (socketListeners.size === 0 && sharedSocket) {
      sharedSocket.disconnect();
      sharedSocket = null;
    }
  };
}

/**
 * Jedno źródło licznika dla headera i dolnego paska. Gdyby każdy komponent
 * trzymał własny stan, telefon otwierałby DWA połączenia Socket.IO na raz —
 * na long-pollingu (fallback za proxy) to podwójny ruch bez żadnego zysku.
 */
function useUnreadCount(): UnreadState {
  const { user } = useSession();
  const [state, setState] = useState<UnreadState>({ count: null, authed: true });

  useEffect(() => {
    // Gość (P08): bez sesji nie pytamy o licznik i NIE otwieramy Socket.IO —
    // inaczej konsola gościa dostawała 401 + 400 z gniazda na każdej stronie.
    // `undefined` = sesja jeszcze nieznana → czekamy, nic nie wołamy.
    if (user === undefined) return;
    if (user === null) {
      setState({ count: null, authed: false });
      return;
    }
    let cancelled = false;

    async function refresh() {
      try {
        const data = await apiFetch<{ count: number }>('/me/notifications/unread-count');
        if (!cancelled) setState({ count: data.count, authed: true });
      } catch (err) {
        // 401 = gość: chowamy licznik (ale NIE slot w nawigacji).
        if (!cancelled && err instanceof ApiRequestError && err.status === 401) {
          setState({ count: null, authed: false });
        }
      }
    }

    void refresh();
    const unsubscribe = subscribeNotifications(() => void refresh());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  return state;
}

function BellBadge({ count }: { count: number }) {
  return <span className="bell-badge">{count > 99 ? '99+' : count}</span>;
}

/** Wariant nagłówkowy (desktop): ikona + badge, ukryty dla gościa. */
export function NotificationBell() {
  const { count, authed } = useUnreadCount();

  if (!authed) return null;

  return (
    <Link href="/powiadomienia" className="bell" aria-label="Powiadomienia">
      <IconBell size={20} />
      {count !== null && count > 0 && <BellBadge count={count} />}
    </Link>
  );
}

/**
 * Wariant do dolnego paska: renderuje SAM badge, nigdy nie znika.
 * Slot w pasku jest stały (5 miejsc) — gdyby komponent zwracał `null` dla
 * gościa, układ przeskakiwałby z 5 na 4 kolumny w chwili hydracji.
 */
export function NotificationCountBadge() {
  const { count, authed } = useUnreadCount();

  if (!authed || count === null || count === 0) return null;

  return <BellBadge count={count} />;
}

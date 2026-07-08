'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { apiFetch, ApiRequestError } from '@/lib/api';

// Dzwonek powiadomień: badge liczby nieprzeczytanych + realtime (ADR-007).
// Socket niesie tylko SYGNAŁ „coś przyszło" — licznik zawsze dociągany REST-em.
// Path /api/socket.io/ jedzie tym samym same-origin rewrite co REST (cookies
// sesyjne), z fallbackiem do long-pollingu za restrykcyjnym proxy.
export function NotificationBell() {
  const [count, setCount] = useState<number | null>(null);
  const [authed, setAuthed] = useState(true);

  async function refresh() {
    try {
      const data = await apiFetch<{ count: number }>('/me/notifications/unread-count');
      setCount(data.count);
      setAuthed(true);
    } catch (err) {
      // 401 = gość: chowamy dzwonek.
      if (err instanceof ApiRequestError && err.status === 401) setAuthed(false);
    }
  }

  useEffect(() => {
    void refresh();
    const socket = io({ path: '/api/socket.io/', withCredentials: true });
    socket.on('notification', () => void refresh());
    return () => {
      socket.disconnect();
    };
  }, []);

  if (!authed) return null;

  return (
    <Link href="/powiadomienia" className="bell" aria-label="Powiadomienia">
      🔔
      {count !== null && count > 0 && (
        <span className="bell-badge">{count > 99 ? '99+' : count}</span>
      )}
    </Link>
  );
}

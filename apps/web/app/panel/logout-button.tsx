'use client';

import { useState } from 'react';

import { apiFetch } from '@/lib/api';
import { clearSessionCache } from '@/lib/use-session';

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      // Bez tego nagłówek pokazywałby „Panel" jeszcze po wylogowaniu —
      // migawka sesji żyje w module, a nie w drzewie Reacta.
      clearSessionCache();
      // TWARDA nawigacja, nie router.push: router cache trzyma prefetch „/"
      // z czasów zalogowania (307 → /panel z middleware), więc miękkie
      // przejście po wylogowaniu lądowało w /panel → /logowanie zamiast na
      // landingu (złapane przez e2e P1). Pełne przeładowanie zeruje cache
      // routera i wszystkie migawki modułów naraz.
      window.location.assign('/');
    }
  }

  return (
    <button className="btn secondary" onClick={onLogout} disabled={pending}>
      {pending ? 'Wylogowywanie…' : 'Wyloguj się'}
    </button>
  );
}

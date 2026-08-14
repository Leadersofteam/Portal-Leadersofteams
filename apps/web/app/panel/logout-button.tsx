'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiFetch } from '@/lib/api';
import { clearSessionCache } from '@/lib/use-session';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      // Bez tego nagłówek pokazywałby „Panel" jeszcze po wylogowaniu —
      // migawka sesji żyje w module, a nie w drzewie Reacta.
      clearSessionCache();
      router.push('/');
      router.refresh();
    }
  }

  return (
    <button className="btn secondary" onClick={onLogout} disabled={pending}>
      {pending ? 'Wylogowywanie…' : 'Wyloguj się'}
    </button>
  );
}

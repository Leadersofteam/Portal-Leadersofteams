'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiFetch } from '@/lib/api';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
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

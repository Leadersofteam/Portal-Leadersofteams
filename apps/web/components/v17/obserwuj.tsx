'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

import { Ico } from './ico';

// Obserwowanie — ten sam endpoint co stary przycisk. ADR-010: żadnych liczników obserwujących.
export function Obserwuj({
  userId,
  initiallyFollowing,
}: {
  userId: string;
  initiallyFollowing: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initiallyFollowing);
  const [pending, setPending] = useState(false);
  async function toggle() {
    setPending(true);
    try {
      await apiFetch(`/users/${userId}/follow`, { method: on ? 'DELETE' : 'PUT' });
      setOn(!on);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 401) router.push('/logowanie');
    } finally {
      setPending(false);
    }
  }
  return (
    <button
      className="vbtn obrys"
      type="button"
      disabled={pending}
      aria-pressed={on}
      onClick={() => void toggle()}
    >
      <Ico n="plus" />
      {on ? 'Obserwujesz' : 'Obserwuj'}
    </button>
  );
}

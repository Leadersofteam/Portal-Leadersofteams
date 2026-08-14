'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { IconAppreciate } from '@/components/ui/icons';
import { ApiRequestError, apiFetch } from '@/lib/api';

/**
 * „Doceniam" — jedyna reakcja w Portalu (ADR-010: to miejsce pracy, nie
 * paleta emocji). ZERO punktów Drabinki: docenienie jest sygnałem dla ludzi,
 * nie walutą awansu.
 */
export function AppreciateButton({
  postId,
  initialCount,
  initialActive,
}: {
  postId: string;
  initialCount: number;
  initialActive: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const res = await apiFetch<{ appreciated: boolean; count: number }>(
        `/social/posts/${postId}/appreciate`,
        { method: active ? 'DELETE' : 'PUT' },
      );
      setActive(res.appreciated);
      setCount(res.count);
      router.refresh();
    } catch (err) {
      // 401 = gość: kierujemy do logowania zamiast połykać kliknięcie.
      if (err instanceof ApiRequestError && err.status === 401) router.push('/logowanie');
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={active ? 'appreciate active' : 'appreciate'}
      onClick={() => void toggle()}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? 'Cofnij docenienie' : 'Doceniam'}
    >
      <IconAppreciate size={18} active={active} />
      <span>{count > 0 ? count : 'Doceniam'}</span>
    </button>
  );
}

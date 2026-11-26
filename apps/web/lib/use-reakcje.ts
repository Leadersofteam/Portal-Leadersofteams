'use client';

// Logika „Doceniam” i zakładki — jedna dla starego wyglądu i V17 (różnią się tylko przyciskiem).
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

function usePrzelacznik<T>(
  initialActive: boolean,
  wywolaj: (active: boolean) => Promise<T>,
  odczytaj: (res: T) => boolean,
) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      setActive(odczytaj(await wywolaj(active)));
      router.refresh();
    } catch (err) {
      // 401 = gość: kierujemy do logowania zamiast połykać kliknięcie.
      if (err instanceof ApiRequestError && err.status === 401) router.push('/logowanie');
    } finally {
      setPending(false);
    }
  }

  return { active, pending, toggle };
}

export function useDocenienie(postId: string, initialActive: boolean, initialCount = 0) {
  const [count, setCount] = useState(initialCount);
  const stan = usePrzelacznik(
    initialActive,
    async (active) => {
      const res = await apiFetch<{ appreciated: boolean; count: number }>(
        `/social/posts/${postId}/appreciate`,
        { method: active ? 'DELETE' : 'PUT' },
      );
      setCount(res.count);
      return res;
    },
    (res) => res.appreciated,
  );
  return { ...stan, count };
}

export function useZakladka(
  subjectType: 'SOCIAL_POST' | 'POST',
  subjectId: string,
  initialActive: boolean,
) {
  return usePrzelacznik(
    initialActive,
    (active) =>
      apiFetch<{ bookmarked: boolean }>(`/me/bookmarks/${subjectType}/${subjectId}`, {
        method: active ? 'DELETE' : 'PUT',
      }),
    (res) => res.bookmarked,
  );
}

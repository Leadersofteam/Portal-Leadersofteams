'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { IconBookmark } from '@/components/ui/icons';
import { ApiRequestError, apiFetch } from '@/lib/api';

/**
 * Zakładka — prywatna półka „na później".
 *
 * ADR-010: przycisk pokazuje WYŁĄCZNIE własny stan i nigdzie nie ma liczby
 * zapisań. „Doceniam" obok niego jest sygnałem dla autora, zakładka jest
 * notatką dla siebie — gdyby zaczęła pokazywać, ile osób coś zapisało, stałaby
 * się drugim licznikiem popularności, czyli dokładnie tym, czego Portal nie chce.
 */
export function BookmarkButton({
  subjectType,
  subjectId,
  initialActive,
}: {
  subjectType: 'SOCIAL_POST' | 'POST';
  subjectId: string;
  initialActive: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const res = await apiFetch<{ bookmarked: boolean }>(
        `/me/bookmarks/${subjectType}/${subjectId}`,
        { method: active ? 'DELETE' : 'PUT' },
      );
      setActive(res.bookmarked);
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
      aria-label={active ? 'Usuń z zapisanych' : 'Zapisz na później'}
    >
      <IconBookmark size={18} active={active} />
      <span>{active ? 'Zapisane' : 'Zapisz'}</span>
    </button>
  );
}

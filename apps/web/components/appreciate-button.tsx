'use client';

import { IconAppreciate } from '@/components/ui/icons';
import { useDocenienie } from '@/lib/use-reakcje';

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
  const { active, count, pending, toggle } = useDocenienie(postId, initialActive, initialCount);

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

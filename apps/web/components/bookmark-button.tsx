'use client';

import { IconBookmark } from '@/components/ui/icons';
import { useZakladka } from '@/lib/use-reakcje';

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
  const { active, pending, toggle } = useZakladka(subjectType, subjectId, initialActive);

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

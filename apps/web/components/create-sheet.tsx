'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { IconFeed, IconOrders, IconPlus, IconServices } from '@/components/ui/icons';

/**
 * Arkusz akcji twórczych — środkowy slot dolnego paska.
 *
 * Natywny <dialog> + showModal(): dostajemy za darmo focus trap, warstwę
 * ::backdrop nad wszystkim i zamykanie Escape'em. Zero bibliotek (ADR-009),
 * zero własnego zarządzania fokusem, które i tak wyszłoby gorzej.
 */
const ACTIONS = [
  {
    href: '/feed#composer',
    title: 'Napisz wpis',
    hint: 'Krótka notka do obserwujących',
    Icon: IconFeed,
  },
  {
    href: '/uslugi/nowa',
    title: 'Opublikuj usługę',
    hint: 'Twoje umiejętności z pakietami i ceną',
    Icon: IconServices,
  },
  {
    href: '/zlecenia/nowe',
    title: 'Dodaj zlecenie',
    hint: 'Opisz, czego potrzebujesz — Liderzy złożą oferty',
    Icon: IconOrders,
  },
] as const;

export function CreateSheet() {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function show() {
    ref.current?.showModal();
    setOpen(true);
  }

  function hide() {
    ref.current?.close();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="bottom-nav-create"
        aria-label="Utwórz"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <span className="bottom-nav-create-mark">
          <IconPlus size={24} />
        </span>
        <span>Utwórz</span>
      </button>

      <dialog
        ref={ref}
        className="create-sheet"
        aria-label="Co chcesz utworzyć?"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Kliknięcie w ::backdrop trafia w sam <dialog> — treść jest w <div>.
          if (event.target === ref.current) hide();
        }}
      >
        <div className="create-sheet-inner">
          <p className="create-sheet-title">Co dziś tworzysz?</p>

          {ACTIONS.map(({ href, title, hint, Icon }) => (
            <Link key={href} href={href} className="create-sheet-action" onClick={hide}>
              <span className="create-sheet-icon">
                <Icon size={22} />
              </span>
              <span>
                <strong>{title}</strong>
                <em>{hint}</em>
              </span>
            </Link>
          ))}

          <button type="button" className="btn secondary full" onClick={hide}>
            Zamknij
          </button>
        </div>
      </dialog>
    </>
  );
}

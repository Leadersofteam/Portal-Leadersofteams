'use client';

// Okno modalne V17 (menu konta, kompozytor na telefonie): fokus do środka, Tab w pętli, Esc zamyka,
// po zamknięciu fokus wraca na element, który otworzył okno; tło się nie przewija.
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOKUSOWALNE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="file"]), [tabindex]:not([tabindex="-1"])';

export function useDialog(
  ref: RefObject<HTMLElement | null>,
  otwarte: boolean,
  zamknij: () => void,
) {
  const zamknijRef = useRef(zamknij);
  zamknijRef.current = zamknij;

  useEffect(() => {
    if (!otwarte) return;
    const el = ref.current;
    if (!el) return;
    const wrocDo = document.activeElement as HTMLElement | null;
    const widoczne = () =>
      [...el.querySelectorAll<HTMLElement>(FOKUSOWALNE)].filter((x) => x.getClientRects().length);
    if (!el.contains(document.activeElement)) {
      (el.querySelector<HTMLElement>('[data-fokus]') ?? widoczne()[0])?.focus();
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        zamknijRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const lista = widoczne();
      const pierwszy = lista[0];
      const ostatni = lista[lista.length - 1];
      if (!pierwszy || !ostatni) return;
      const poza = !el!.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === pierwszy || poza)) {
        e.preventDefault();
        ostatni.focus();
      } else if (!e.shiftKey && (document.activeElement === ostatni || poza)) {
        e.preventDefault();
        pierwszy.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (wrocDo?.isConnected) wrocDo.focus();
    };
  }, [otwarte, ref]);
}

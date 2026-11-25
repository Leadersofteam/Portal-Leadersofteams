'use client';

import { useState } from 'react';

import { Ico } from './ico';

// Udostępnianie bez zewnętrznych usług (ADR-009): Web Share API, a gdy go nie ma — kopia linku.
export function Udostepnij({
  href,
  tytul,
  klasa = 'akcja',
}: {
  href: string;
  tytul: string;
  klasa?: string;
}) {
  const [ok, setOk] = useState(false);
  async function onClick() {
    const url = new URL(href, window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: tytul, url });
      else {
        await navigator.clipboard.writeText(url);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }
    } catch {
      /* anulowanie okna udostępniania nie jest błędem */
    }
  }
  return (
    <button
      className={klasa}
      type="button"
      onClick={onClick}
      aria-label={ok ? 'Skopiowano link' : 'Udostępnij'}
      title={ok ? 'Skopiowano link' : 'Udostępnij'}
    >
      <Ico n="share-network" />
    </button>
  );
}

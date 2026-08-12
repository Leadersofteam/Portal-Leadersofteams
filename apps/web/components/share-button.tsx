'use client';

import { useState } from 'react';

import { IconShare } from '@/components/ui/icons';

/**
 * Udostępnianie: na telefonie natywny arkusz systemowy (Web Share API), na
 * desktopie kopiowanie linku. Zero bibliotek, zero zewnętrznych „share
 * buttonów" śledzących użytkownika (ADR-009 i polityka prywatności).
 *
 * To nasz jedyny kanał wirusowy za 0 zł — dlatego ma działać wszędzie, także
 * gdy przeglądarka nie zna navigator.share.
 */
export function ShareButton({
  url,
  title,
  label = 'Udostępnij',
}: {
  url: string;
  title: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const absolute = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: absolute });
        return;
      } catch {
        // Anulowanie arkusza to nie błąd — spadamy do kopiowania.
      }
    }
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Skopiuj link:', absolute);
    }
  }

  return (
    // aria-label niesie znaczenie także wtedy, gdy na wąskim ekranie CSS chowa
    // etykietę tekstową (patrz styles/social.css) — ikona zostaje klikalna i
    // opisana dla czytników ekranu.
    <button type="button" className="share-btn" onClick={() => void share()} aria-label={label}>
      <IconShare size={18} />
      <span>{copied ? 'Skopiowano link' : label}</span>
    </button>
  );
}

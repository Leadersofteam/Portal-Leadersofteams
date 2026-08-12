import Link from 'next/link';
import type { ReactNode } from 'react';

import { ART, type ArtName } from '@/components/ui/illustrations';

/**
 * Pusty stan z ilustracją, tytułem, opisem i (opcjonalnie) CTA — zamiast gołego
 * <p className="muted">. Empty state to moment motywacyjny, nie przeprosiny.
 *
 * `art` dobieramy do znaczenia, nie do ozdoby: „ladder" = konstrukcja stoi, ale
 * jest pusta; „rung" = jest wolne miejsce dla Ciebie; „lantern" = cel; „inbox" =
 * cisza; „search" = brak wyników.
 */
export function EmptyState({
  title,
  children,
  ctaHref,
  ctaLabel,
  art,
}: {
  title: string;
  children?: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  art?: ArtName;
}) {
  const Art = art ? ART[art] : null;

  return (
    <div className="empty-state">
      {Art ? <Art className="empty-art" /> : null}
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {ctaHref && ctaLabel ? (
        <Link className="btn" href={ctaHref}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

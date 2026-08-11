import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Pusty stan z tytułem, opisem i (opcjonalnie) CTA — zamiast gołego
 * <p className="muted">. Empty state to moment motywacyjny, nie przeprosiny.
 */
export function EmptyState({
  title,
  children,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  children?: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="empty-state">
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

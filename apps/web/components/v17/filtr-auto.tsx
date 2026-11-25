'use client';

import type { ReactNode } from 'react';

// Formularz filtrów (GET), który wysyła się sam po zmianie pola — jak w makiecie, gdzie pola nie mają
// przycisku „Filtruj”. Bez JS (albo przed hydracją) zostaje <noscript> z przyciskiem, więc filtr działa zawsze.
export function FiltrAuto({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <form
      method="get"
      className={className}
      aria-label={label}
      onChange={(e) => e.currentTarget.requestSubmit()}
    >
      {children}
      <noscript>
        <button className="vbtn obrys" type="submit">
          Filtruj
        </button>
      </noscript>
    </form>
  );
}

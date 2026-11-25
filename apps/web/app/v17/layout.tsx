import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Ekrany V17 „Światło” żyją pod /v17/*, ale użytkownik widzi zwykłe adresy (/feed, /drabinka,
// /profil/…): middleware robi rewrite wyłącznie przy włączonej fladze wyglądu. Bezpośrednie
// wejście w /v17/* nie ma być indeksowane ani mieć własnego adresu kanonicznego.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function V17Layout({ children }: { children: ReactNode }) {
  return children;
}

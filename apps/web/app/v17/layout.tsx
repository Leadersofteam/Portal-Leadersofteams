import type { ReactNode } from 'react';

// Ekrany V17 żyją pod /v17/*, ale użytkownik widzi zwykłe adresy (middleware robi rewrite). NIE dodawaj tu
// `metadata.robots`: objęłoby strony publiczne. Bezpośrednie /v17/* wyłącza z indeksu `app/robots.ts`.
export default function V17Layout({ children }: { children: ReactNode }) {
  return children;
}

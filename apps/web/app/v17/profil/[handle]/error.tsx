'use client';

import Link from 'next/link';

import { Komunikat } from '@/components/v17/karty';
import { Rama } from '@/components/v17/rama';

// error.tsx obok page.tsx jest bezpieczne dla [handle] (nie zmienia statusu 404 — robi to notFound()).
// loading.tsx tu NIE wolno (MINY): szkielet profilu jest w page.tsx przez Suspense, po sprawdzeniu 404.
export default function ProfilError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Rama aktywny="liderzy" ja={null} szeroka>
      <div className="naglowek">
        <h1>Profil</h1>
      </div>
      <Komunikat
        ikona="cloud-slash"
        tytul="Nie udało się wczytać profilu"
        opis="To po naszej stronie. Twoje punkty i wpisy są bezpieczne."
      >
        <button className="vbtn glowny" type="button" onClick={reset}>
          Spróbuj ponownie
        </button>
        <Link className="vbtn obrys" href="/feed">
          Wróć do strumienia
        </Link>
      </Komunikat>
    </Rama>
  );
}

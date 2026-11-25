'use client';

import Link from 'next/link';

import { Komunikat } from '@/components/v17/karty';
import { Rama } from '@/components/v17/rama';

export default function DrabinkaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Rama aktywny="drabinka" ja={null} szeroka>
      <div className="naglowek">
        <h1>Drabinka Lidera</h1>
      </div>
      <Komunikat
        ikona="cloud-slash"
        tytul="Nie udało się wczytać Drabinki"
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

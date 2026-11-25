'use client';

import Link from 'next/link';

import { Komunikat } from '@/components/v17/karty';
import { Rama } from '@/components/v17/rama';

export default function FeedError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Rama aktywny="feed" ja={null}>
      <div className="naglowek">
        <h1>Strumień</h1>
      </div>
      <Komunikat
        ikona="cloud-slash"
        tytul="Nie udało się wczytać strumienia"
        opis="To po naszej stronie. Twoje wpisy są bezpieczne."
      >
        <button className="vbtn glowny" type="button" onClick={reset}>
          Spróbuj ponownie
        </button>
        <Link className="vbtn obrys" href="/">
          Strona główna
        </Link>
      </Komunikat>
    </Rama>
  );
}

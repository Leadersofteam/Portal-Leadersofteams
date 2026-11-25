'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

export default function ZleceniaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="zlecenia"
      naglowek="Zlecenia"
      tytul="Nie udało się wczytać zleceń"
      reset={reset}
    />
  );
}

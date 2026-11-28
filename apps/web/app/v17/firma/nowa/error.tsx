'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="zlecenia"
      szeroka
      reszta
      naglowek="Dodaj firmę"
      tytul="Nie udało się wczytać formularza"
      reset={reset}
    />
  );
}

'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="uslugi"
      szeroka
      reszta
      naglowek="Edytuj usługę"
      tytul="Nie udało się wczytać usługi"
      reset={reset}
    />
  );
}

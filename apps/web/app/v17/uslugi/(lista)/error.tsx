'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

export default function UslugiError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="uslugi"
      szeroka
      naglowek="Usługi"
      tytul="Nie udało się wczytać usług"
      reset={reset}
    />
  );
}

'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

export default function DrabinkaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="drabinka"
      szeroka
      naglowek="Drabinka Lidera"
      tytul="Nie udało się wczytać Drabinki"
      reset={reset}
    />
  );
}

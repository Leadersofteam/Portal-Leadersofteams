'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

// Bez loading.tsx w tym katalogu i wyżej: inaczej Next zwraca 200 zamiast 404 dla nieistniejącego id.
export default function FirmaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="zlecenia"
      szeroka
      reszta
      naglowek="Firma"
      tytul="Nie udało się wczytać firmy"
      reset={reset}
    />
  );
}

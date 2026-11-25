'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

// Bez loading.tsx w tym katalogu i wyżej (poza grupą listy): inaczej Next zwraca 200 zamiast 404 dla nieistniejącego zlecenia.
export default function ZlecenieError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="zlecenia"
      szeroka
      naglowek="Zlecenie"
      tytul="Nie udało się wczytać zlecenia"
      reset={reset}
    />
  );
}

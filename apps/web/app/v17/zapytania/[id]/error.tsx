'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

// Bez loading.tsx w tym katalogu i wyżej: inaczej Next zwraca 200 zamiast 404 dla nieistniejącego id.
export default function ZapytanieError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="uslugi"
      szeroka
      reszta
      naglowek="Zapytanie"
      tytul="Nie udało się wczytać zapytania"
      reset={reset}
    />
  );
}

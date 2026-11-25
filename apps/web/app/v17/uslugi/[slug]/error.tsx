'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

// Bez loading.tsx w tym katalogu i wyżej (poza grupą listy): inaczej Next zwraca 200 zamiast 404 dla nieistniejącej usługi.
export default function UslugaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="uslugi"
      szeroka
      naglowek="Usługa"
      tytul="Nie udało się wczytać usługi"
      reset={reset}
    />
  );
}

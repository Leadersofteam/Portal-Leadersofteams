'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

// Bez loading.tsx w tym katalogu i wyżej: inaczej Next zwraca 200 zamiast 404 dla nieistniejącego id.
export default function OfertaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="zlecenia"
      szeroka
      reszta
      naglowek="Rozmowa o ofercie"
      tytul="Nie udało się wczytać rozmowy"
      reset={reset}
    />
  );
}

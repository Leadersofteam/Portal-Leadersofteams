'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

export default function FeedError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="feed"
      naglowek="Strumień"
      tytul="Nie udało się wczytać strumienia"
      reset={reset}
    />
  );
}

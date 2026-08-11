'use client';

import { useEffect } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Digest trafia do logów serwera; tu tylko sygnał w konsoli przeglądarki.
    console.error(error);
  }, [error]);

  return (
    <main>
      <div className="empty-state" style={{ marginTop: '3rem' }}>
        <h3>Coś poszło nie tak</h3>
        <p>
          Nie udało się wczytać tej strony. Spróbuj ponownie — jeśli problem wraca, wróć za kilka
          minut.
        </p>
        <button className="btn" type="button" onClick={reset}>
          Spróbuj ponownie
        </button>
      </div>
    </main>
  );
}

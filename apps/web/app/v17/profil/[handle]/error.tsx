'use client';

import { ErrorEkranu } from '@/components/v17/error-ekranu';

// error.tsx obok page.tsx jest bezpieczne dla [handle] (status 404 robi notFound()).
// loading.tsx tu NIE wolno (MINY): szkielet profilu jest w page.tsx przez Suspense, po sprawdzeniu 404.
// Rama bez „szeroka” — jak stan błędu profilu w makiecie.
export default function ProfilError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorEkranu
      aktywny="liderzy"
      naglowek="Profil"
      tytul="Nie udało się wczytać profilu"
      reset={reset}
    />
  );
}

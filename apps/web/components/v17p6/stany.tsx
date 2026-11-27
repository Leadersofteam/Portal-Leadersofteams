'use client';

// 404 i błąd w V17 P6. Pliki not-found/error są wspólne dla obu wyglądów i nie przechodzą przez rewrite,
// więc wybór pada w przeglądarce (bez cookies() — nie wolno popsuć prerenderu). Bez opt-inu: dzisiejszy ekran.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { przywrocMotyw } from '@/components/v17/error-ekranu';
import { Ico } from '@/components/v17/ico';

import { DrabinaArt, StanIkona } from './czesci';
import { RamaPubliczna } from './rama';

function useOptIn() {
  const [p6, setP6] = useState(false);
  useEffect(() => {
    if (!/(?:^|; )lot_wyglad=v17p6(?:;|$)/.test(document.cookie)) return;
    przywrocMotyw();
    setP6(true);
  }, []);
  return p6;
}

export function Stan404({ dzis }: { dzis: ReactNode }) {
  if (!useOptIn()) return dzis;
  return (
    <RamaPubliczna>
      <div className="pelny-stan">
        <DrabinaArt przerywane />
        <h1>404 — ta strona nie istnieje</h1>
        <p>Rekord mógł zostać usunięty albo adres jest niepełny.</p>
        <Link className="vbtn glowny" href="/">
          Wróć na stronę główną
        </Link>
      </div>
    </RamaPubliczna>
  );
}

export function StanBledu({ dzis, reset }: { dzis: ReactNode; reset: () => void }) {
  if (!useOptIn()) return dzis;
  return (
    <RamaPubliczna>
      <div className="pelny-stan" role="alert">
        <StanIkona ikona="warning" rodzaj="zle" />
        <h1>Coś poszło nie tak</h1>
        <p>
          Nie udało się wczytać tej strony. Spróbuj ponownie — jeśli problem wraca, wróć za kilka
          minut.
        </p>
        <button className="vbtn glowny" type="button" onClick={reset}>
          <Ico n="arrow-clockwise" />
          Spróbuj ponownie
        </button>
      </div>
    </RamaPubliczna>
  );
}

'use client';

import { useEffect, useState } from 'react';

import { apiFetch, ApiRequestError } from '@/lib/api';

export interface SessionState {
  /** null = wiadomo, że gość. undefined = jeszcze nie wiadomo. */
  user: { id: string; displayName: string } | null | undefined;
}

/**
 * Sesja dla komponentów KLIENCKICH (nagłówek).
 *
 * ZASTANY BŁĄD, który to naprawia: `SiteHeader` nigdy nie czytał sesji, więc
 * zalogowany użytkownik na KAŻDEJ stronie widział w nagłówku „Zaloguj się /
 * Dołącz". Zgłoszone przy S12 i otwarte do S17.
 *
 * Dlaczego po stronie klienta, a nie w `layout.tsx`: `serverApi` czyta cookies,
 * a odczyt cookies w root layoucie uczyniłby DYNAMICZNĄ każdą stronę Portalu,
 * łącznie z landingiem i regulaminem. Nagłówek jest wart jednego lekkiego
 * żądania, nie utraty prerenderu całego serwisu.
 *
 * Jedno pobranie na całą stronę: obietnica jest współdzielona na poziomie
 * modułu, więc dwa komponenty pytające o sesję nie robią dwóch żądań (ta sama
 * lekcja co przy dzwonku powiadomień, gdzie dwa liczniki otwierały dwa gniazda).
 */
type Me = { user: { id: string; displayName: string } | null };

let inflight: Promise<Me> | null = null;

function fetchSession(): Promise<Me> {
  inflight ??= apiFetch<Me>('/auth/me').catch((err: unknown) => {
    // 401 = gość. Każdy inny błąd też traktujemy jak „nie wiadomo, kto to" —
    // nagłówek nie jest miejscem na komunikat o awarii API.
    if (err instanceof ApiRequestError) return { user: null };
    return { user: null };
  });
  return inflight;
}

export function useSession(): SessionState {
  const [user, setUser] = useState<SessionState['user']>(undefined);

  useEffect(() => {
    let cancelled = false;
    void fetchSession().then((data) => {
      if (!cancelled) setUser(data.user);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user };
}

/** Po wylogowaniu migawka modułu jest nieaktualna — wołane przez wylogowanie. */
export function clearSessionCache() {
  inflight = null;
  // Migawka feedu do offline (PD4) trzyma wyłącznie treści publiczne, ale
  // po wylogowaniu i tak znika — następna osoba przy tym samym telefonie
  // zaczyna od zera, nie od cudzego „ostatnio czytane".
  try {
    localStorage.removeItem('lot_offline_feed');
  } catch {
    /* tryb prywatny — nie ma czego czyścić */
  }
}

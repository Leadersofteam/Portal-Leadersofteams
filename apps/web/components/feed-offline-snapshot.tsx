'use client';

import { useEffect } from 'react';

export const OFFLINE_FEED_KEY = 'lot_offline_feed';

export interface OfflineFeedItem {
  /** Nazwa autora — publiczna. */
  name: string;
  /** ISO czasu publikacji. */
  time: string;
  /** Treść wpisu albo opis zdarzenia — to, co widzi GOŚĆ na /feed. */
  text: string;
  /** Poziom autora (0 = brak) — publiczny, niesie temperaturę karty offline. */
  lv: number;
}

/**
 * Migawka feedu do czytania offline (PD4, S20 pkt 3).
 *
 * ZASADA NADRZĘDNA sw.js obowiązuje i tutaj: do pamięci urządzenia trafia
 * WYŁĄCZNIE to, co widzi niezalogowany gość — zakres „cała społeczność",
 * bez pól widza (docenienia, zakładki). Zakresu „obserwowani" nie zapisujemy
 * wcale: sam DOBÓR wpisów zdradzałby, kogo obserwuje poprzedni użytkownik
 * telefonu. Klucz jest czyszczony przy wylogowaniu (clearSessionCache).
 */
export function FeedOfflineSnapshot({ items }: { items: OfflineFeedItem[] }) {
  useEffect(() => {
    try {
      localStorage.setItem(
        OFFLINE_FEED_KEY,
        JSON.stringify({ savedAt: Date.now(), items: items.slice(0, 20) }),
      );
    } catch {
      // Pełny magazyn albo tryb prywatny — migawka jest udogodnieniem,
      // nie funkcją krytyczną; cisza jest tu świadoma.
    }
  }, [items]);
  return null;
}

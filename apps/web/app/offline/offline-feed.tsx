'use client';

import { useEffect, useState } from 'react';

import { OFFLINE_FEED_KEY, type OfflineFeedItem } from '@/components/feed-offline-snapshot';

interface Snapshot {
  savedAt: number;
  items: OfflineFeedItem[];
}

function kiedy(ts: number): string {
  return new Date(ts).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function godzina(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Ostatni zapisany obraz feedu (PD4, S20 pkt 3). Czyta localStorage w
 * useEffect — czyli PO hydracji: pierwsza wersja wstrzykiwała karty skryptem
 * inline przy parsowaniu i hydracja Reacta ZDEJMOWAŁA je z DOM (sekcja
 * wracała do stanu serwerowego — pustego). Zasoby strony /offline są w
 * precache service workera (sw.js parsuje chunki z HTML przy instalacji),
 * więc komponent działa też bez sieci.
 */
export function OfflineFeed() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_FEED_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Snapshot;
      if (Array.isArray(data?.items) && data.items.length > 0) setSnap(data);
    } catch {
      // uszkodzona migawka nie może zepsuć strony offline
    }
  }, []);

  if (!snap) return null;

  return (
    <section id="offline-feed" aria-label="Ostatni zapisany obraz feedu">
      <h2>Ostatni zapisany obraz feedu</h2>
      <p className="muted">
        Zapisany {kiedy(snap.savedAt)}, z zakresu „cała społeczność". Docenienia, komentarze i nowe
        wpisy wrócą razem z siecią.
      </p>
      {snap.items.slice(0, 20).map((it, i) => (
        <article
          key={i}
          className="card offline-feed-card"
          style={
            it.lv >= 1 ? { borderLeft: `3px solid var(--level-${Math.min(it.lv, 7)})` } : undefined
          }
        >
          <p className="offline-feed-head">
            <strong>{it.name}</strong>
            {it.time && <span className="muted"> · {godzina(it.time)}</span>}
          </p>
          <p className="offline-feed-body">{it.text}</p>
        </article>
      ))}
    </section>
  );
}

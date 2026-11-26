'use client';

// Ekran bez sieci (makieta braki.js, stan „offline”). Czyta migawkę publicznych wpisów z localStorage po
// hydracji (zasady: components/feed-offline-snapshot). Wersję starą dostaje tylko ktoś z jawnym
// ciasteczkiem lot_wyglad=off — strona /offline jest statyczna, więc wybór musi paść w przeglądarce.
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { OFFLINE_FEED_KEY, type OfflineFeedItem } from '@/components/feed-offline-snapshot';
import { plural, timeAgo } from '@/lib/v17';

import { Ico } from './ico';
import { Rama, Stopka } from './rama';
import { Aw, Odznaka } from './znaki';

interface Snapshot {
  savedAt: number;
  items: OfflineFeedItem[];
}

function zapisano(ts: number): string {
  const d = new Date(ts);
  const godz = d.toLocaleTimeString('pl-PL', { hour: 'numeric', minute: '2-digit' });
  const wczoraj = new Date(Date.now() - 86_400_000);
  const dzien =
    d.toDateString() === new Date().toDateString()
      ? 'dziś'
      : d.toDateString() === wczoraj.toDateString()
        ? 'wczoraj'
        : d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  return `${dzien}, ${godz}`;
}

export function OfflineWybor({ stary }: { stary: ReactNode }) {
  const [wygladStary, setWygladStary] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    setWygladStary(/(?:^|; )lot_wyglad=off(?:;|$)/.test(document.cookie));
    try {
      const data = JSON.parse(localStorage.getItem(OFFLINE_FEED_KEY) ?? 'null') as Snapshot | null;
      if (data && Array.isArray(data.items) && data.items.length > 0) setSnap(data);
    } catch {
      // uszkodzona migawka nie może zepsuć strony offline
    }
  }, []);

  if (wygladStary) return <>{stary}</>;
  const lista = snap?.items.slice(0, 20) ?? [];
  return (
    <Rama
      aktywny="feed"
      offline
      boczna={
        <aside className="bok">
          <div className="bok-lepki">
            <Stopka />
          </div>
        </aside>
      }
    >
      <div className="naglowek">
        <h1>Strumień</h1>
      </div>
      <div className="offline" role="status">
        <Ico n="cloud-slash" />
        <span>
          <b>Jesteś offline</b>
          <small>
            {snap ? `Ostatni zapisany strumień z ${zapisano(snap.savedAt)}. ` : ''}Publikowanie
            wróci razem z siecią.
          </small>
        </span>
        <button className="vbtn obrys" type="button" onClick={() => window.location.reload()}>
          <Ico n="arrow-clockwise" />
          Odśwież
        </button>
      </div>
      {lista.map((it, i) => (
        <article className="wpis" key={i}>
          <Aw name={it.name} size={40} />
          <div>
            <div className="glowa">
              <span className="imie">{it.name}</span>
              <Odznaka level={it.lv} />
              <span className="czas">· {timeAgo(it.time)}</span>
            </div>
            <div className="vmeta">
              <span className="typ">
                <Ico n="article" />
                <span>Wpis</span>
              </span>
              {it.branza ? (
                <>
                  <span className="sep" aria-hidden="true">
                    ·
                  </span>
                  {it.branza}
                </>
              ) : null}
            </div>
            <p className="tresc">{it.text}</p>
          </div>
        </article>
      ))}
      <div className="wiecej">
        <small className="num">
          {lista.length
            ? `${lista.length} ${plural(lista.length, 'zapisany wpis', 'zapisane wpisy', 'zapisanych wpisów')} · tylko to, co publiczne`
            : 'Na tym urządzeniu nie ma jeszcze zapisanych wpisów.'}
        </small>
      </div>
    </Rama>
  );
}

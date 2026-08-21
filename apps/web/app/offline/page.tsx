import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/empty-state';

// Strona-zaślepka dla service workera: musi być statyczna, bo w chwili jej
// pokazania nie ma sieci — żadnego serverApi, żadnych danych.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Jesteś offline — Leaders of Teams',
  robots: { index: false, follow: false },
};

/*
 * Migawka feedu (PD4, S20 pkt 3) renderowana skryptem INLINE, nie Reactem:
 * precache service workera trzyma tylko ten dokument HTML — chunki Reacta
 * mogą nie być w cache, jeśli użytkownik nigdy nie odwiedził /offline z siecią.
 * Skrypt siedzi w samym dokumencie, więc działa zawsze. Treść wchodzi przez
 * textContent (nigdy innerHTML) — wpisy użytkowników nie mogą wstrzyknąć HTML.
 * Dane: localStorage 'lot_offline_feed' — wyłącznie to, co widzi gość
 * (zapis: components/feed-offline-snapshot.tsx; czyszczenie: wylogowanie).
 */
const OFFLINE_FEED_SCRIPT = `(function () {
  try {
    var raw = localStorage.getItem('lot_offline_feed');
    if (!raw) return;
    var data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) return;
    var root = document.getElementById('offline-feed');
    if (!root) return;
    var h = document.createElement('h2');
    h.textContent = 'Ostatni zapisany obraz feedu';
    root.appendChild(h);
    var p = document.createElement('p');
    p.className = 'muted';
    var kiedy = data.savedAt ? new Date(data.savedAt).toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
    p.textContent = 'Zapisany ' + kiedy + ', z zakresu „cała społeczność". Docenienia, komentarze i nowe wpisy wrócą razem z siecią.';
    root.appendChild(p);
    data.items.slice(0, 20).forEach(function (it) {
      var card = document.createElement('article');
      card.className = 'card offline-feed-card';
      var lv = Number(it.lv);
      if (lv >= 1) {
        card.style.setProperty('border-left', '3px solid var(--level-' + Math.min(lv, 7) + ')');
      }
      var head = document.createElement('p');
      head.className = 'offline-feed-head';
      var kto = document.createElement('strong');
      kto.textContent = String(it.name || '');
      head.appendChild(kto);
      if (it.time) {
        var t = document.createElement('span');
        t.className = 'muted';
        t.textContent = ' · ' + new Date(it.time).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        head.appendChild(t);
      }
      var body = document.createElement('p');
      body.className = 'offline-feed-body';
      body.textContent = String(it.text || '');
      card.appendChild(head);
      card.appendChild(body);
      root.appendChild(card);
    });
  } catch (e) { /* uszkodzona migawka nie może zepsuć strony offline */ }
})();`;

export default function OfflinePage() {
  return (
    <main>
      <EmptyState
        art="ladder"
        title="Jesteś offline — drabina poczeka"
        ctaHref="/feed"
        ctaLabel="Spróbuj ponownie"
      >
        Nie mamy teraz połączenia z siecią. Twoje szczeble nigdzie nie uciekną: wróć, gdy zasięg
        wróci, a wszystko będzie na swoim miejscu.
      </EmptyState>
      <section id="offline-feed" aria-label="Ostatni zapisany obraz feedu" />
      <script dangerouslySetInnerHTML={{ __html: OFFLINE_FEED_SCRIPT }} />
    </main>
  );
}

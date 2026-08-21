/*
 * Service worker Portalu — celowo minimalny.
 *
 * ZASADA NADRZĘDNA: nie zapisujemy do Cache Storage NICZEGO, co może zawierać
 * dane zalogowanego użytkownika. Każda strona Portalu jest renderowana na
 * serwerze z ciasteczkiem sesji, więc odpowiedź nawigacyjna to często czyjś
 * panel. Zapisana w cache przeżyłaby wylogowanie i pokazałaby się następnej
 * osobie sięgającej po ten sam telefon. Cache'ujemy wyłącznie statyki
 * z odciskiem w nazwie i stronę offline.
 */
// v2 (PD4): /offline dostał migawkę feedu — zmiana wersji wymusza reinstalację
// SW i odświeżenie precache'owanego dokumentu (stary siedziałby w cache'u
// do końca świata, bo instalacja idzie tylko za zmianą bajtów tego pliku).
const CACHE = 'lot-v2';
const PRECACHE = ['/offline', '/icon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(PRECACHE);
      // /offline renderuje migawkę feedu klientowym Reactem (PD4) — bez jego
      // chunków strona offline byłaby szkieletem bez treści u kogoś, kto nigdy
      // nie odwiedził /offline z siecią. Nazwy chunków mają odcisk builda,
      // więc bierzemy je z aktualnego HTML zamiast wpisywać na sztywno.
      try {
        const res = await fetch('/offline');
        const html = await res.text();
        const zasoby = [
          ...new Set(
            Array.from(html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g), (m) => m[1]),
          ),
        ];
        await cache.addAll(zasoby);
      } catch {
        // brak sieci przy instalacji — precache bazowy wystarczy na zaślepkę
      }
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API: nigdy. Sesje, powiadomienia, pliki prywatne.
  if (url.pathname.startsWith('/api/')) return;

  // Nawigacje: zawsze z sieci; offline dostaje stronę-zaślepkę. Bez cache.put.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline').then((res) => res ?? Response.error())),
    );
    return;
  }

  // Statyki z odciskiem w nazwie oraz ikony: cache-first (są niezmienne).
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

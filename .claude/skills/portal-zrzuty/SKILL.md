---
name: portal-zrzuty
description: Zrzuty ekranu widoków Portalu LoT headlessowym Chromium na 390 i 1440 px — na stagingu, produkcji albo lokalnym stacku. Użyj po KAŻDEJ zmianie w UI, przed uznaniem widoku za gotowy, oraz gdy trzeba zobaczyć, jak coś naprawdę wygląda.
---

# Zrzut ekranu widzi więcej niż test

Lista rzeczy, które w tym repo złapał **wyłącznie zrzut**, przy komplecie zielonych testów:
odwrócona szyna postępu, monospace w kompozytorze (`textarea` poza `.field` nie dziedziczy
fontu), obcięty link przez `truncate` na 390 px, łamiący się na dwie linie uchwyt w karcie
cytatu i błąd gramatyczny „na Portalu od 3 miesiące".

`innerText` nie widzi obcięcia przez CSS. Dlatego zrzut jest **częścią bramki**, nie dodatkiem.

## Szkielet skryptu

Odpalaj **z `apps/web`** (tam jest `@playwright/test`) i **kasuj plik po sobie** — inaczej
lint wywali się na `console`/`process`, które w tym pakiecie nie są zadeklarowane.

```js
// apps/web/shot.tmp.mjs
import { chromium } from '@playwright/test';
import { readdirSync } from 'node:fs';

const cacheDir = '/root/.cache/ms-playwright';
const dir = readdirSync(cacheDir)
  .filter((d) => d.startsWith('chromium-'))
  .sort()
  .pop();
// UWAGA: katalog to `chrome-linux64`, NIE `chrome-linux`.
const executablePath = `${cacheDir}/${dir}/chrome-linux64/chrome`;

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36';
const browser = await chromium.launch({ executablePath });

for (const [label, width, height] of [
  ['390', 390, 900],
  ['1440', 1440, 1000],
]) {
  const ctx = await browser.newContext({ viewport: { width, height }, userAgent: UA });
  const page = await ctx.newPage();
  // `load`, NIE `networkidle` — networkidle wisi na pollingu Socket.IO.
  await page.goto('https://leadersofteams.pl/feed', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `/tmp/feed-${label}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
```

## Gdzie celować

- **produkcja**: `https://leadersofteams.pl` — publiczna, bez przeszkód,
- **staging**: siedzi za basic-auth Traefika, więc najprościej wejść bezpośrednio
  na kontener:
  ```bash
  docker inspect portal-staging-web-1 \
    --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}'
  # → http://<IP>:3000
  ```
- **lokalnie**: `http://127.0.0.1:3000` po ręcznym postawieniu stacku.

## Trzy rzeczy, o które łatwo się potknąć

**1. `fullPage` a elementy `position: fixed`.** Dolny pasek nawigacji renderuje się w zrzucie
pełnostronicowym w miejscu, w którym akurat był — potrafi zasłonić przycisk i wyglądać jak
brakująca funkcja. Zanim zgłosisz błąd z takiego zrzutu, sprawdź ten sam widok na 1440 px.

**2. Nie mierz stanu, zanim API odpowie.** Komponenty kliencki (np. baner potwierdzenia
adresu) renderują się dopiero po odpowiedzi. Liczenie elementów tuż po `waitForURL` daje
fałszywy „BRAK". Czekaj na element (`waitFor`), nie na czas.

**3. Bramka anty-bot przy rejestracji.** Skrypt tworzący konto przez API musi rozwiązać
proof-of-work: pobrać `/auth/challenge`, znaleźć `n` takie, że `sha256(salt+n) === target`,
odczekać 2 s i dopiero wysłać `humancheck: { id, number }`. Formularz w przeglądarce robi
to sam — jeśli klikasz jak człowiek, nie musisz nic dodawać.

## Na co naprawdę patrzeć

Nie „czy się wyświetliło", tylko: czy tekst się nie łamie, czy nic nie jest obcięte, czy
polska odmiana jest poprawna, czy pusty stan mówi coś sensownego, czy cel dotyku ma ≥ 44 px.
**Otwórz zrzut i obejrzyj go** — zapisanie pliku nie jest weryfikacją.

## Dwa motywy = cztery komplety (P2, 27.08)

Portal ma motyw jasny (`[data-theme='light']` na `<html>`). Po każdej zmianie
wyglądu rób zrzuty w OBU motywach (390 i 1440 × dark/light). Jasny w headlessie
włączysz przed `goto`:

```js
await page.addInitScript(() => localStorage.setItem('lot_theme', 'light'));
```

Boot w layout.tsx odczyta to przed pierwszym paintem. Wracasz do ciemnego przez
`localStorage.removeItem('lot_theme')`. Zasady motywu: `docs/MINY.md` (sekcja
„Motyw zmienia się TYLKO tokenami").

## Rytm V17 PRO (od 19.11) — 1512 + 390 × jasny + ciemny, pełna strona

W programie V17 (skill `portal-v17-design`) zrzuty robisz w rozmiarach rodziny z LoT App, żeby para
makieta ↔ Portal była porównywalna 1:1 (agent `zgodnosc-makiety`). 1440 zostaje dla starszych porównań.

- Rozmiary: **1512×982** (dsf 1) i **390×844** (`isMobile`, `hasTouch`, dsf 2). Jasny pierwszy (to dostaje Maciej), ciemny drugi.
- `fullPage: true` na obu + dodatkowo na 390 sam pierwszy ekran (`-390-ekran.png`) — dolny pasek `fixed` w pełnej stronie ląduje
  w środku obrazu (pułapka 1 wyżej).
- Wygląd V17 w kodzie: `localStorage.setItem('lot_wyglad', 'v17')` w `addInitScript` obok `lot_theme`.
- Pomiar po zrzucie: `document.documentElement.scrollWidth` = szerokość ORAZ najszerszy element w `main`
  (`getBoundingClientRect().width` ≤ `innerWidth`) — sam `scrollWidth` nie widzi przycięcia przez `overflow:hidden`.
  Wyjątek: kontenery `[data-przesuw]` (karuzele — zgoda Macieja na przesuwanie kafelków w poziomie).
- Nazwa: `audyt/zrzuty/v17-<ekran>[-<stan>]-<jasny|ciemny>-<1512|390>.png` (ta sama co makiety).
- Makiety HTML: gotowy `node audyt/harness/v17-makiety-zrzuty.mjs <plik.html> <nazwa> [stany…] [--pelna]`.
- Przed serią: MemAvailable ≥ 1500 MB i SwapFree ≥ 500 MB; jeden proces Chromium naraz (VPS wspólny z LoT App).

## Zrzuty z builda w worktree (26.11)

Przepis: baza dev (migrate + seed + `SEED_DEMO=1 prisma/seed-demo.ts`, `UPLOADS_DIR` w /tmp) → `next build` → api + worker + web
lokalnie → dane stanów przez API (konto demo, hasło `demo-portal-2026`; stan pusty = konto bez obserwowanych) → Playwright → gaszenie
procesów PO CWD worktree (`readlink /proc/<pid>/cwd`; zabicie `pnpm exec` zostawia `next-server`). Stany po kliknięciu (menu, pisanie)
rób zawsze — tylko one złapały menu bez stylów.

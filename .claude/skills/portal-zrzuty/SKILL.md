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

---
name: portal-scena-3d
description: Budowa i zmiana sceny 3D (pole cząstek WebGL) w Portalu LoT — drabinka 3D w hero, nowe sceny na stronach publicznych, płynne przejścia sterowane przewijaniem, ADR-009 (zero sieci), tokeny --level-*, SVG jako stan bez WebGL, weryfikacja filmem klatek 390 + 1440. Użyj przy pracy nad `components/ui/ladder-scene.tsx`, `components/scene/` albo gdy użytkownik mówi „3D", „scena", „cząsteczki", „particles", „WebGL", „przejścia", „płynność", „drabinka w 3D", „opowieść przewijana", „scrollytelling", „/drabinka", „sieć LoT".
---

# Scena 3D Portalu — „Drabinka w przestrzeni"

Kanon kierunku: **`docs/KIERUNEK-3D.md`** (kopia z leadersofteams.com). Kierunek sieci i plan opowieści przewijanej: **`docs/SIEC-LOT.md`** (sekcja „Następny krok” niżej). Miny: `docs/MINY.md` → „Scena 3D".

## Reguły twarde

1. **ADR-009.** Silnik to własny WebGL (`components/scene/particleField.ts`), zero CDN, zero fetchy.
   three.js, Spline, Lottie z sieci — nie. Ikony i ilustracje dalej rysujemy sami.
2. **ADR-010 dotyczy też ruchu.** Scena nie może nagradzać obecności: żadnego licznika, streaku,
   „pulsowania, gdy ktoś coś zrobił". Ruch opowiada regułę produktu (status się zdobywa), nie aktywność.
3. **Punkt = poziom**, kolor = `--level-1…7` (te same tokeny co `LevelBadge`). Bursztyn tylko na szczycie.
4. **SVG `LadderArt` zostaje w DOM-ie zawsze** i gaśnie dopiero po `onReady` (`data-scene="on"`).
5. **Komponent sceny to `'use client'`** z dynamicznym `import()` silnika w `useEffect` — strona główna
   zostaje komponentem serwerowym, a kanwa nie istnieje w HTML-u z serwera.
6. Silnik ma trzy kopie (Portal, App, .com = kanon) + `FIELD_VERSION`. **Typecheck Portalu jest najostrzejszy**
   (`noUncheckedIndexedAccess`) — poprawki rób w kanonie, potem kopiuj.

## Weryfikacja

```bash
pnpm format && pnpm lint && pnpm --filter @lot/web typecheck
cd apps/web && npx next build && npx next start --port 3011 &
CHROMIUM_PATH=/opt/pw-browsers/chromium node ../../.claude/skills/portal-scena-3d/film.mjs \
  http://127.0.0.1:3011/ /tmp/portal 1440 900 0 600 300      # + 390 × 844, REDUCE=1
```

Pełny rytm sprintu dalej obowiązuje: `portal-bramki` (realny MySQL/Redis, e2e) → `portal-zrzuty` → staging → prod.
Na arkuszu: drabina kompletna przy 0 px, wspinaczka widoczna przy ~300 px, SVG niewidoczny pod sceną, konsola czysta.

## Następny krok — „Światło z cudzych rąk” (opowieść przewijana, od 2026-10-21)

Właściciel: _„czegoś brakuje — przewijania 3D i opowiadania historii w płynnych przejściach”_.
Dziś drabinka gra wyłącznie w hero. Kierunek portalu, rozdziały i wspólna gramatyka sieci:
**`docs/SIEC-LOT.md`** §3 i §4.2 (ten sam plik w czterech repo). Prompt: `docs/PROMPT-SIEC-3D.md`.

0. **Najpierw drzwi.** Portal nie linkuje dziś do żadnego z trzech pozostałych adresów
   (`components/ui/footer.tsx`). Wiersz czterech adresów — etykiety `LOT App`,
   `Sieć Liderów`, `O firmie`, `International / EN`, dosłownie, z „Jesteś tutaj” na
   własnej pozycji — zanim finał sceny zacznie wskazywać aplikację. Linki to nie
   wywołania HTTP, ADR-009 ich nie dotyczy.
1. **Prawo tej sceny: twój punkt nigdy nie świeci sam.** Każde rozjaśnienie przychodzi
   od innego punktu — firmy (ocena zlecenia) albo człowieka, któremu pomogłeś (uznana
   odpowiedź). To ADR-004 narysowane. Strukturalnie: w danych formacji punkt „Ty” nie
   ma kroku jasności bez punktu-źródła w tym samym rozdziale — sprawdź to testem,
   nie okiem.
2. **Rekrutacja tylko jako to, co nie daje światła.** Rozdział „czego Drabinka nie
   nagradza”: punkty zaproszeń i logowań przelatują i gasną. Żadna formacja nie może
   układać się w drzewo poleceń ani piramidę — ani w trakcie przejścia (sprawdź klatki
   pośrednie filmu, nie tylko stany końcowe). Przejdź `portal-anty-mlm`.
3. **Ruch opowiada regułę, nie aktywność (ADR-010).** Sceny nie zasilają dane na żywo:
   zero liczników, zero „ktoś właśnie awansował”. Tor jest skończony — siedem poziomów.
4. **Gdzie:** hero `/` zostaje; pełny tor na `/drabinka` (ta sama scena, inna trasa).
   Progi i reguły wyłącznie z danych portalu, które `/drabinka` już renderuje.
5. **Silnik:** tor ma 6 rozdziałów, silnik trzyma 4 formacje — okno przesuwne slotów,
   `FIELD_VERSION` 4 we wszystkich trzech kopiach (karta §3.1 pkt 13). Kanon w `.com`.
6. **Finał:** L5 → brama do aplikacji LOT, L7 → złoto (`--level-7`), wokół punktu
   zbiera się zespół → link do `app.leadersofteams.com`.

**Rytuał rozwoju:** pułapka z sesji → „Scena 3D” w `docs/MINY.md` i tutaj; zasada
wspólna dla czterech stron → `docs/SIEC-LOT.md` we wszystkich czterech repo
(`SIEC_VERSION + 1`, prettier przed kopiowaniem).

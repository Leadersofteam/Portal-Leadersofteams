---
name: portal-design
description: Bramka jakości UX/UI dla każdej zmiany wyglądu Portalu LoT — tokeny zamiast hexów, mobile-first 390 px, własne SVG zamiast bibliotek, pętla zrzut→krytyka→dostępność, test anty-generyczności, granice ADR-009/010. Użyj przy każdej zmianie interfejsu, nowym ekranie, sprintach PD1–PD4 i gdy użytkownik mówi „popraw design", „wygląda generycznie", „zrób to ładniej".
---

# Design — proces, nie gust

Kierunek i sprinty: `docs/DESIGN-SPRINTY.md`. Paleta primary jest WSPÓLNA z App —
decyzja zapada w D1 programu App, Portal ją przejmuje (nie prowadź osobnego konkursu).

## Reguły twarde (złamanie = zmiana wraca)

1. **Zero nowych hexów w komponentach** — kolory tylko jako tokeny w `app/globals.css`.
2. **Sygnatura Portalu to światło poziomów** (`--level-1…7`, „im wyżej, tym cieplejsze") —
   każde miejsce pokazujące poziom Lidera używa tej skali; temperatura zawsze w parze
   z etykietą (czytelność bez rozróżniania barw).
3. **390 px kciukiem**: cele ≥44 px (pilnuje e2e mobile-shell), akcja główna w zasięgu
   kciuka, dolny pasek 5 slotów nie rośnie.
4. **ADR-009**: ilustracje i ikony rysujemy SAMI w SVG; zero zasobów z obcych domen
   w runtime (fonty przez `next/font` zostają — self-host w buildzie).
5. **ADR-010**: żadnych confetti, streaków, liczników wyświetleń, infinite scrolla,
   „ktoś pisze…" — ruch służy orientacji, nie retencji. Gdy animacja ma podnieść
   „zaangażowanie", a nie zrozumienie — wycinamy.
6. **ADR-004**: żaden element wizualny nie celebruje zapraszania ani aktywności
   społecznej jako drogi do statusu.
7. **Komplet stanów** (pusty z podpowiedzią ruchu, ładowanie, błąd) + focus states.
8. Żadnych nowych bibliotek UI — tożsamość na własnych komponentach.

## Pętla weryfikacji (po każdej zmianie, przed „gotowe")

```
kod → pnpm build → zrzuty (skill portal-zrzuty: 390 + 1440)
    → PATRZYSZ NA ZRZUT oczami (obcięcia, łamania, gramatyka — łapał je tylko zrzut)
    → design:design-critique na zrzutach
    → kontrast nowych par kolorów na ciemnym tle (zmierzony, nie „wygląda ok")
    → pomiar LCP/CLS gdy zmiana dotyka pierwszej mili (bazowe liczby: PD1)
    → dopiero teraz „gotowe"
```

Pełny audyt WCAG (`design:accessibility-review`) — na koniec sprintu.

## Test anty-generyczności (kryterium akceptacji ekranu)

Zrzut naszego ekranu obok generycznego szablonu tej samej kategorii (feed, marketplace,
profil) — bez logo. **Nierozpoznawalny = niedokończony.** Wyróżniki do wzmacniania:
- światło poziomów Drabinki jako nić przewodnia,
- Bricolage Grotesque na nagłówkach i liczbach-bohaterach,
- własne ilustracje SVG (stany puste, onboarding) — spójna kreska, nie clipart,
- ślad zaufania (oceny, zrealizowane zlecenia, poziom) jako główny element kart —
  design opowiada zasadę „status trzeba zapracować".

## Które skille wołać do czego

| Potrzeba | Skill |
|---|---|
| Nowy ekran / kierunek wizualny | `frontend-design` |
| Animacje i mikrointerakcje (w granicach ADR-010) | `anthropic-skills:emil-design-eng` |
| Ocena gotowego ekranu | `design:design-critique` |
| Audyt WCAG na koniec sprintu | `design:accessibility-review` |
| Teksty: CTA, stany puste, odmowy, błędy | `design:ux-copy` |
| Wykresy analityki | `dataviz` |
| Zrzuty | `portal-zrzuty` |

## Pułapki tego repo przy pracy nad UI

- `textarea` poza `.field` nie dziedziczy fontu (mina z kompozytora).
- Strona serwerowa, która importuje hooki `'use client'`, wciąga paczkę na klienta —
  lekcja z sąsiedniego projektu; pilnuj granicy server/client przy ozdobnikach.
- Middleware analityki: nowa strona MUSI wejść do `KNOWN_PATHS` (inaczej ląduje w `/inne`).
- Zmiana `NEXT_PUBLIC_*`/`next.config.ts` wymaga REBUILDU, nie restartu.

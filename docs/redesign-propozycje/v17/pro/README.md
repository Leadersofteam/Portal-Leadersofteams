# V17 PRO — język „Światło” (makieta 20.11.2026)

Druga próba P0 po uwadze Macieja do makiety P0′: „No napewno nie wygląda to jak V17 PRO a bardziej jak V7. Musimy doprowadzić
design do perfekcji, inspiruj się od najlepszych.” Tę makietę przygotował Lider (Opus), a nie sesja robocza.

## Co było nie tak w P0′ (diagnoza ze zrzutów)

1. Wszystkie wpisy wyglądały tak samo: tekst + szara karta. Zlecenie, pytanie, realizacja i usługa nie różniły się niczym.
2. Zamiast twarzy były inicjały w kółku, a firmy miały jedną wspólną ikonę budynku. Przez to „kto dał światło” nie miało twarzy.
3. Typografia nie miała skali: wszystko 14–16 px, nagłówki ledwo większe od tekstu.
4. Drabinka była listą tekstu, w której „bez nowych uprawnień” powtarzało się 5 razy.
5. Okładki realizacji to lawendowe prostokąty z ikoną, które wyglądały jak zaślepki.

## Zasady „Światła” (od najlepszych: Linear, Vercel, GitHub, X, Fiverr)

| Zasada | Skąd | Jak w Portalu |
|---|---|---|
| Jeden znak rozpoznawczy, użyty wszędzie | Apple Fitness (pierścienie) | **Pierścień Drabinki**: 7 łuków wokół awatara; pełne łuki to zdobyte szczeble, częściowy łuk to droga do następnego |
| Poziom czytelny bez legendy | paski zasięgu, Fiverr | **Szczebelki**: 7 rosnących słupków i nazwa szczebla w kolorze `--level-n` |
| Każdy typ treści ma własną formę | Linear (issue ≠ PR), Oferteo | zlecenie = fakty + licznik ofert; realizacja = **promień** firma → Lider z „+pkt”; pytanie = tytuł jako treść; usługa = okładka + cena „od” |
| Ciepło tylko dla zapracowanego | SIEC-LOT §4.2 | bursztyn wyłącznie przy +pkt, „dojrzewa” i L7 |
| Powierzchnie warstwami, nie ramkami | Linear / Vercel | `--surface`/`-2`/`-3`, linie 1 px o niskim kontraście, cień z wewnętrznym światłem |
| Typografia ze skalą | Vercel / Stripe | Bricolage 800 w liczbach i tytułach (−0,035em), Inter z cv11/ss01, cyfry tabelaryczne |
| Grafika własna, zero zdjęć z sieci | ADR-009 | okładki rysowane w SVG według branży; awatar to gradient z nazwy (w kodzie: zdjęcie z uploadu, a gradient jako zastępstwo) |

## Nowe tokeny do `globals.css` przy kodzie

`--surface-2`, `--surface-3`, `--line`, `--line-2`, `--warm`/`--warm-rgb`, `--t-zlecenie|pytanie|realizacja|usluga`.
Istniejące `--level-*`, `--primary-*` i `--text-*` zostają bez zmian (jasne wartości z globals).

## Granice

- ADR-010: brak liczników wyświetleń i polubień w strumieniu; „Pokaż więcej 8 z 87”; kolejność chronologiczna.
- ADR-004: tabela „Czego Drabinka nie liczy” stoi na widoku.
- Wszystkie liczby Drabinki pochodzą z `rules.ts`: progi, 100/80/40/0, ×0,5ⁿ (minimum ×0,1) w 365 dniach, ×0,5 dla firmy młodszej niż 14 dni, 50/10, 300 na 7 dni, 20% od L4, karencja 7 dni.
- Nie ma DM: na profilu są „Zaproponuj zlecenie”, „Obserwuj” i „Udostępnij”.

## CDN tylko w makiecie

Pliki HTML ładują Bricolage i Inter z Google Fonts, a Phosphor Web z unpkg. **W kodzie aplikacji jest to zabronione (ADR-009).** Tam używamy `next/font` (fonty self-hosted) i `@phosphor-icons/react` (duotone, decyzja z 19.11).

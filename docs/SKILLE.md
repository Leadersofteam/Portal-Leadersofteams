# Skille projektowe — proces zamiast pamięci

Skille żyją w `.claude/skills/<nazwa>/SKILL.md` i są **wczytywane automatycznie**, gdy zadanie
pasuje do opisu. Nie trzeba ich przywoływać z nazwy — ale można (`/portal-wdrozenie`).

Zasada powstawania: **proces, który powtórzył się trzeci raz, przestaje być akapitem
w dokumentacji i staje się Skillem.** Dokumentacja opisuje STAN, Skill opisuje CZYNNOŚĆ.

## Mapa

| Skill                       | Kiedy się włącza                                            | Czego pilnuje                                                                                         |
| --------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **portal-bramki**           | przed każdym commitem i wdrożeniem; „sprawdź", „przetestuj" | liczba wykonanych testów zamiast koloru, sierota na porcie, odtworzenie bazy po e2e                   |
| **portal-wdrozenie**        | „wdróż", „deploy", diagnoza po wdrożeniu                    | `portal-prod` ≠ `portal`, migrate za profilem tools, backup przed migracją, trzy sygnały w `/healthz` |
| **portal-migracja**         | każda zmiana schematu                                       | brak TTY, pusty plik blokujący migracje, ENUM jako liczba porządkowa, expand-only                     |
| **portal-anty-mlm**         | każda funkcja społeczna                                     | rozszerzenie ścieżki w teście strukturalnym — inaczej zieleni się przez pominięcie                    |
| **portal-dane-demo**        | zasianie/zdjęcie danych przykładowych                       | dwie flagi na produkcji, `--purge`, `chown` po seedzie, prawdziwa ścieżka kodu                        |
| **portal-zrzuty**           | po każdej zmianie w UI                                      | 390 i 1440 px, `waitUntil: 'load'`, `chrome-linux64`, kasowanie pliku tymczasowego                    |
| **portal-zamkniecie-sesji** | „domknij", „przygotuj do następnej sesji"                   | sprzątanie kont testowych, sprostowania w HANDOFF, push                                               |
| **portal-awaria**           | produkcja nie działa po wdrożeniu, „wycofaj", „przywróć"    | rollback obrazów bez cofania migracji (expand-only), restore z kopii z drillem, worker.alive ≠ Up     |
| **portal-stan-zastany**     | start sesji, pozycja z roadmapy, raport „zamknięte"         | `git log -S`/grep przed kodowaniem, skutek w bazie zamiast logu wysyłki, ścieżka z KLIKNIĘCIEM linku  |
| **portal-design**           | każda zmiana wyglądu, sprinty PD1–PD4, „popraw design"      | tokeny zamiast hexów, światło poziomów jako sygnatura, własne SVG, granice ADR-009/010, test anty-generyczności |
| playwright-cli / -trace     | automatyzacja przeglądarki z CLI, inspekcja trace'ów        | kopie oficjalnych skilli z `node_modules/playwright-core` (odśwież po upgradzie Playwrighta)          |
| prisma-cli                  | referencja składni komend Prisma                            | oficjalny skill Prismy (opisuje 7.x; repo ma 6.19 — flagi sprawdzaj przy rozjeździe)                  |

## Skille zewnętrzne podnoszące jakość (z wtyczek właściciela)

Nie są w repo — pochodzą z instalacji Claude Code właściciela. `portal-design` woła je
w swojej pętli; poniżej mapa do użycia także poza sprintami designu:

| Proces | Skill |
| --- | --- |
| Nowy ekran / kierunek wizualny | `frontend-design` |
| Ocena gotowego ekranu (pętla zrzut → krytyka) | `design:design-critique` |
| Kontrast, klawiatura, czytniki, cele dotyku (WCAG 2.1 AA) | `design:accessibility-review` |
| Animacje i mikrointerakcje (w granicach ADR-010) | `anthropic-skills:emil-design-eng` |
| Teksty: CTA, stany puste, odmowy, komunikaty błędów | `design:ux-copy` |
| Wykresy analityki | `dataviz` |
| Porządek i dokumentacja w `components/ui/` | `design:design-system` |
| Pisanie i naprawa testów e2e (Playwright) | `anthropic-skills:playwright-expert` |
| Prompt startowy, wybór modelu, pytania o API Claude'a | `claude-api` — nie odpowiadaj z pamięci |
| Pisanie nowego skilla projektowego | `anthropic-skills:skill-creator` |

Granica bez zmian: skille `sales:*`, `seo-*` na płatnych kontach i konektory OAuth
(Figma, Slack…) są poza zasięgiem — ADR-009 („0 zł, zero zewnętrznych dostawców").

## Czego w skillach świadomie NIE MA

**Wiedzy o produkcie** — ta jest w [CLAUDE.md](../CLAUDE.md) i w ADR-ach. Skill mówi „jak
zrobić", nie „co jest ważne". Gdyby zaczął tłumaczyć produkt, rozjechałby się z briefem
przy pierwszej zmianie kierunku.

**Kopii listy min** — pułapki są w [MINY.md](MINY.md), skille tylko odsyłają do tych, które
dotyczą ich czynności. Jedna lista, jedno miejsce do aktualizacji.

## Dokładając skill

1. Sprawdź, czy to naprawdę **czynność powtarzalna**, a nie jednorazowa decyzja.
2. `description` musi zawierać **frazy wyzwalające** („gdy użytkownik mówi…"), inaczej skill
   nie włączy się sam.
3. Pisz o pułapkach, nie o szczęśliwej ścieżce. Szczęśliwą ścieżkę model odtworzy sam;
   miny — nie.
4. Prefiks `portal-` jest obowiązkowy: na tym VPS obok stoi repo App z własnymi skillami
   (`lot-*`) i nazwy nie mogą kolidować.

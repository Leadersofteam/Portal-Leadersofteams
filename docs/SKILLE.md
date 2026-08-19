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
| playwright-cli / -trace     | automatyzacja przeglądarki z CLI, inspekcja trace'ów        | kopie oficjalnych skilli z `node_modules/playwright-core` (odśwież po upgradzie Playwrighta)          |
| prisma-cli                  | referencja składni komend Prisma                            | oficjalny skill Prismy (opisuje 7.x; repo ma 6.19 — flagi sprawdzaj przy rozjeździe)                  |

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

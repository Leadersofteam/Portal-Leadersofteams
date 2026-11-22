---
name: portal-lider-dnia
description: Rola „Lider dnia” w Portalu LoT (leadersofteams.pl) — koordynator na Opusie, który mierzy stan (RAM/swap, hash bundla prod, gałęzie), uruchamia maks. 2 sesje robocze na Sonnecie 5.5 (każda we własnym worktree) z promptem wg szablonu, weryfikuje każde „zrobione” własnym pomiarem i zamyka dzień bez sierot. Użyj, gdy sesja ma prowadzić inne sesje w Portalu, przy słowach „Lider”, „Lider dnia”, „koordynuj”, „sesje równoległe”, „paczka P0…P7”, „V17 PRO Portalu”, „zamknij dzień”, oraz na starcie programu z docs/PROGRAM-*.md.
---

# Lider dnia Portalu — koordynacja sesji z pomiarem

Wzorzec z LoT App (17.11: pięć sesji „idle”, żadna zamknięta, brief stary o 25 h, 32 commity niewypchnięte).
Tu ta sama dyscyplina, dopasowana do Portalu. Bieżący program: `docs/PROGRAM-V17-PORTAL.md` (skill `portal-v17-design`).

## 1. Start (≤ 3 wywołania)

1. Pomiar jednym poleceniem:
   ```bash
   free -m; git -C /docker/portal-staging status -sb | head -3
   curl -s https://leadersofteams.pl/ | grep -oE '/_next/static/chunks/app/(page|layout)-[^"]*\.js' | sort -u
   ~/.claude/skills/scalanie-galezi/stan-galezi.sh /docker/portal-staging
   ```
2. `docs/SESJA-NASTEPNA.md` (wstrzykuje hook) i program `docs/PROGRAM-*.md`, na który wskazuje.
3. **Bramka pamięci (VPS wspólny z LoT App):** MemAvailable ≥ 1500 MB i SwapFree ≥ 500 MB przed każdą budową i serią zrzutów.
   Gdy nie przechodzi: zaproponuj archiwizację bezczynnych sesji (archiwizujesz tylko na „tak” właściciela; nigdy aktywnych sesji App).

## 2. Uruchamianie sesji

- **Maks. 2 sesje naraz, buduje/robi zrzuty jedna.** Model sesji: `claude-sonnet-5-5`. Lider = Opus.
- Każda sesja: `start_session` z `context: fresh`, własny worktree z bieżącej gałęzi programu (`feat/v17-portal`; prod Portalu nie stoi na `main` — pamięć `portal-prod-nie-na-main`).
- Prompt składasz z `szablon-promptu.md` (obok). Sekcji nie pomijasz. Decyzje i zasady Macieja wklejasz **dosłownie** w `<decyzje>`.
- Zgoda nie przenosi się między sesjami (schemat bazy, masowe dane, hasła realnych kont — osobno, z datą i cytatem).
- Wszystko ciężkie przez kolejkę VPS (wspólną z LoT App i Zodiamo): `/root/scripts/vps-kolejka.sh budowa -- <budowa>` (zawsze jedna),
  `… lekkie -- <typecheck/test/lint>`, `… zrzuty -- <harness headless>`; `… stan` pokazuje, kto trzyma i od kiedy. Nie używaj gołego `flock`.

## 2b. Gdy start sesji się nie udaje

- `start_session` z tury wywołanej wiadomością innej sesji jest odrzucany — tylko karta propozycji; startujesz na słowa właściciela.
- Gdy host nie odpowiada: zapisz pełne prompty do `docs/PROMPT-V17-PORTAL-SESJE.md`, wypchnij, a w następnej turze startuj krótkim „przeczytaj sekcję X”.

## 2z. Po każdej budowie — sprzątanie (zasada VPS od 22.11.2026)

Pomiar 22.11: 14 osieroconych wolumenów po bazach próbnych w jeden dzień (3 GB), dysk 86–93 %, blokada budowy trzymana 20–40 min przy budowie obrazu trwającej 2–6 min. Wpisz te punkty do promptu każdej sesji, która buduje:

1. **Kolejka po zadaniu `budowa` wypisuje linie `po-budowie:`** — przeczytaj je i usuń swoje pozycje przed meldunkiem „wdrożone” (ręcznie: `/root/scripts/po-budowie.sh`). Osierocone wolumeny usuwa sama.
2. **Kontener próbny (baza, aplikacja) usuwasz `docker rm -fv`**, nigdy samym `rm -f` — bez `-v` zostaje wolumen 214 MB.
3. **Po zrzutach usuń swój katalog `dist`** (`/tmp/*dist*`, `/root/v17-artefakty/<paczka>/dist`) i zakończ procesy podglądu; obrazy `kandydat-*` — zostaw jeden do powrotu, resztę `docker rmi <tag>`.
4. **Pod `budowa` tylko to, co buduje obraz.** Bramka, lint, typecheck, testy → `vps-kolejka.sh lekkie`; weryfikacja po wdrożeniu → bez kolejki. Inaczej dwa pozostałe repo czekają na Twoje testy.
5. **`docker builder prune` wyłącznie pod blokadą** (`vps-kolejka.sh budowa -- docker builder prune -af --max-used-space 4GB`), nigdy luzem — luzem psuje cudzą trwającą budowę. Pełne `-af` dopiero, gdy po tym nadal brakuje miejsca: kasuje pamięć podręczną wszystkim trzem repo (następna budowa każdego idzie od zera).
6. **Worktree po scaleniu zgłoś do usunięcia** (`/root/scripts/worktree-kandydaci.sh --rozmiar`) — to one zajmują dysk, nie pamięć podręczna budowy.

## 3. W trakcie

- Notatka sesji to raport, nie dowód. „Zrobione” piszesz po **własnym** pomiarze: zrzut (Read obrazu), wynik agenta, hash bundla z HTTPS, SELECT.
- Makieta → `recenzent-wygladu` bez P1 → SendUserFile (1512 jasny + 390) → **jedno** pytanie o akceptację → wiersz w tabeli programu.
- Kod → `zgodnosc-makiety` ZGODNY w 4 parach → `portal-bramki` → `portal-wdrozenie` (ręcznie).
- Pytania sesji do właściciela przekazujesz dosłownie; odpowiedź wraca do sesji jako cytat.
- Sesję z długim kontekstem wymieniasz na świeżą z briefem (raport sesji ≤ 10 linii).

## 4. Zamknięcie dnia: warunek, nie życzenie

`stan-galezi.sh` musi pokazać czubek wypchnięty i zero gałęzi sesji „do zamknięcia” z dzisiaj; brief `docs/SESJA-NASTEPNA.md` zmieniony dziś.
Gałąź sesji scalasz do gałęzi programu (konflikt: nie cofaj nowszej poprawki), potem skill `portal-zamkniecie-sesji`,
prompt startowy następnego Lidera w bloku do skopiowania i propozycja archiwizacji zakończonych sesji.

## 5. Raport dla właściciela

Pierwsze zdanie = wynik. Tabela „sesja → co zrobiła → mój dowód → stan”, „Czeka na Ciebie” (jedno pytanie), „Niezweryfikowane” (obowiązkowo).

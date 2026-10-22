---
name: portal-zamkniecie-sesji
description: Domknięcie sesji nad Portalem LoT — sprzątanie kont testowych, wpis w HANDOFF, aktualizacja roadmapy i promptu startowego, push gałęzi. Użyj na koniec pracy, gdy użytkownik mówi „domknij", „przygotuj do następnej sesji", „zaktualizuj dokumenty" albo „kończymy".
---

# Zamknięcie sesji — żeby następna zaczęła od faktów

## 1. Posprzątaj po sobie na produkcji

Właściciel ma stałą zgodę na konta testowe na produkcji — pod warunkiem, że znikają.
W tym repo konta testowe potrafiły zostać na miesiąc i **były mylnie liczone jako realni
użytkownicy** (przez to raport „3 realne konta" był nieprawdą).

```bash
cd /docker/portal-staging/infra
MYSQL_PW=$(grep '^MYSQL_PASSWORD=' .env.prod | cut -d= -f2-)
docker compose -p portal-prod exec -T mysql mysql -uportal -p"$MYSQL_PW" portal \
  -e "SELECT id, email, displayName, DATE(createdAt) FROM users ORDER BY createdAt;"
```

Konta `@test.local` usuwaj razem z treścią (kolejność: dzieci → rodzice; cytaty odepnij
`quotedPostId = NULL` PRZED kasowaniem cytowanych wpisów). Kont z prawdziwą domeną
**nie ruszaj bez decyzji właściciela** — zapytaj.

Usuń też pliki tymczasowe z repo (`apps/web/*.tmp.mjs`) — inaczej lint padnie na `console`.

## 2. Sprawdź, czy produkcja jest zdrowa

```bash
docker compose -p portal-prod ps                   # wszystkie (healthy)
curl -fsS https://api.leadersofteams.pl/healthz    # worker.alive + uploads: ok
docker compose -p portal-prod logs worker --since 10m | grep "bez konsumenta"
```

## 3. Zaktualizuj dokumenty — w tej kolejności

- **`docs/HANDOFF-OPUS.md`** — baner sesji NA GÓRZE: co weszło, jakie decyzje zapadły
  i **dlaczego**, jakie zastane błędy znalazłeś. Jeśli któryś wcześniejszy wpis okazał się
  nieprawdziwy — **napisz sprostowanie wprost**, nie poprawiaj po cichu.
- **`docs/SPRINTY-S15-S19.md`** — odhacz zrobione, dopisz to, co odkryłeś po drodze.
- **`docs/MINY.md`** — każda pułapka, która kosztowała Cię dziś czas, trafia tutaj.
- **`docs/RISKS.md`** — nowe ryzyka wraz z decyzją właściciela i sposobem odwrócenia.
- **`docs/SESJA-NASTEPNA.md`** — zadanie na następną sesję + świeże miny.
- Jeśli proces powtórzył się trzeci raz — zrób z niego **Skill**, nie akapit w docs.

## 4. Commit i push

Commit ma tłumaczyć **DLACZEGO**, nie wyliczać plików. Wzorzec z tego repo: co było zepsute,
jaka była przyczyna, dlaczego takie rozwiązanie, co świadomie odrzucono.

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**Stan gałęzi przed pushem:** uruchom `~/.claude/skills/scalanie-galezi/stan-galezi.sh /docker/portal-staging`.
Warunek zamknięcia: „brak z main: 0” i „wypchnięta”. Te 2–3 linie wklej do raportu i do sekcji „Stan”
w briefie; gałęzie z „wchłonięte” dopisz do listy „do zamknięcia na GitHubie” dla właściciela.
Przed PR-em do `main` uruchom agenta `recenzent-galezi` (globalny, `~/.claude/agents/`) — przygotowuje opis PR.

```bash
git push          # PR tworzy WŁAŚCICIEL — na VPS nie ma `gh`
```

## 5. Powiedz właścicielowi trzy rzeczy

1. **Co działa** — sprawdzone, nie zadeklarowane.
2. **Co znalazłeś zastanego** — wprost, bez przypisywania sobie zasługi za brak błędu.
3. **Czego potrzebujesz od niego** — jednym akapitem, konkretnie (sekrety, decyzje).

Nie raportuj jako zrobione niczego, czego nie przeszedłeś ścieżką użytkownika.

## Kontrakt z hookiem startu sesji (od 23.09) — obowiązkowy

Hook `~/.claude/hooks/start-sesji.sh` wstrzykuje następnej sesji z `docs/SESJA-NASTEPNA.md` TYLKO sekcje, których
nagłówek zawiera „Zadania”, „Czego nie”, „Czeka na” albo „Nie wolno”. Dlatego:

- `docs/SESJA-NASTEPNA.md` **nadpisz** (≤ ~40 linii): `## Stan (zmierzony)`, `## Zadania w kolejności` (punkt 1 wykonalny
  od razu), `## Czego nie robić`, opcjonalnie `## Czeka na właściciela`, na końcu `## Prompt startowy` (2–3 zdania).
- Commituj tylko swoje ścieżki: `git commit -m "…" -- <pliki>` (równoległe sesje, cudzy `git add -A`).
- Pamięć projektu: `~/.claude/projects/-docker-<repo>/memory/` — jedna linia w `MEMORY.md` ≤ 150 znaków.
- Na koniec zaproponuj właścicielowi archiwizację sesji (zwalnia ~100–200 MB swapu).

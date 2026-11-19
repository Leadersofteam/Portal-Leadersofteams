# Szablon promptu sesji roboczej (Lider dnia Portalu → sesja Sonnet)

Zasady, z których wynika ten układ:

- **Kontekst przed zadaniem, zadanie na końcu.** Długie materiały idą na górę, a polecenie na dół; model najlepiej trzyma to, co przeczytał ostatnio.
- **Sekcje w znacznikach XML.** Sesja może się odwołać do `<ograniczenia>`, zamiast zgadywać, gdzie kończy się kontekst.
- **Każda reguła ma uzasadnienie.** Sesja z powodem sama rozstrzyga przypadki brzegowe, a sesja z samym zakazem przestrzega go mechanicznie.
- **Zamiast „zrób dobrze” są kryteria sukcesu, które da się zmierzyć.** Na „gotowe” sesja ma dowód: SELECT, hash albo zrzut.
- **Format wyjścia jest określony** (raport od wyniku plus „Niezweryfikowane”), więc koordynator nie musi go parafrazować.
- **Bez kopiowania CLAUDE.md.** Sesja i tak go czyta, więc prompt zawiera tylko to, czego CLAUDE.md nie mówi.
- **Długość ≤ ~60 linii.** Każda linia kosztuje kontekst przez całą sesję.

```xml
<rola>Jesteś sesją <NAZWA> w Portalu LoT (repo /docker/portal-staging, własny worktree z gałęzi programu feat/v17-portal), model claude-sonnet-5-5.
Koordynuje Cię Lider dnia; raportujesz jemu, pytania do właściciela zadajesz przez niego.</rola>

<cel_biznesowy>Jedno zdanie „X przestaje robić Y”. Bez niego zadanie nie wchodzi.</cel_biznesowy>

<stan_zmierzony data="DD.MM HH:MM UTC">
Liczby z pomiaru Lidera (free -m, hash bundla leadersofteams.pl, stan-galezi.sh) i SELECT-ów, nie z dokumentów. Hash bundla, czubek gałęzi, liczby rekordów.
</stan_zmierzony>

<decyzje>Cytaty właściciela DOSŁOWNIE, z datą. Zakres każdej zgody (np. „tylko tabela X, tylko staging”). Zasady Macieja V17 — dosłownie z docs/PROGRAM-V17-PORTAL.md.</decyzje>

<zadanie>
1. Punkt wykonalny od razu, z plikami do ruszenia i funkcją do ponownego użycia (ścieżka).
2. …
</zadanie>

<ograniczenia>
Tylko to, czego nie ma w CLAUDE.md albo co dziś szczególnie grozi. Każde z powodem, np.
„Nie buduj, dopóki sesja H nie zamelduje końca wdrożenia, bo dwie budowy naraz zawiesiły VPS 09.09”.
</ograniczenia>

<skille_i_agenci>Którego skilla załadować na którym kroku i którego agenta puścić przed wdrożeniem.</skille_i_agenci>

<kryteria_sukcesu>
Mierzalne: „SELECT … zwraca ≥ 1 wiersz ze statusem X”, „nowy hash bundla”, „zrzut 390 kontem <rola>”, „testy modułu zielone”.
</kryteria_sukcesu>

<format_raportu>
Pierwsze zdanie = wynik. Zrobione (z dowodem) / Czeka na właściciela / Niezweryfikowane (obowiązkowo, nawet pusta).
Na koniec: commity po ścieżkach, gałąź wypchnięta (bez scalania do main, bez force-push), raport ≤ 10 linii.
</format_raportu>
```

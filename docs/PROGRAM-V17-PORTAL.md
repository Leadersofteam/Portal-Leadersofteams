# Program „Portal LOT V17 PRO” — nowy wygląd Portalu (od 19.11.2026)

## Decyzja właściciela (19.11.2026, brief Lidera)

> „Nowy wygląd Portalu w stylu siostrzanym do zatwierdzonego »Feniks v17 pro« z LoT App: ta sama rodzina (szyna↔panel menu, ikony Phosphor duotone,
> tło »siatka liderów«, karty z obramowaniem gradientowym, gęste dane, Feniks), ale z akcentem i treścią marketplace'u B2B i społeczności Liderów.
> Portal i App mają wyglądać jak jedna sieć.”

Decyzje szczegółowe:

- 19.11 — ikony: **„Phosphor jak w App”** (wyjątek od „ikony rysujemy sami”, ADR-009 nietknięty — paczka npm, zero sieci w runtime).
- Zasady Macieja (cytować dosłownie w briefach): „Kod nie może się różnić od makiety którą akceptuję to jest zasada.” /
  „Kod musi być zgodny z Makietami a nawet je dopracowywać jeśli zauważy błędy.” /
  „Na telefonie wszystko musi się mieścić w ekranie ewentualnie zgadzam się na przesuwanie kafelków i komponentów w poziomie.” /
  „Musisz kontrolować kontekst w sesjach… Rozwijaj się z sesji na sesje twórz skille i agentów.” „Ty jesteś Opus a one mają być na sonet 5.5.”

Wzorzec rodziny: `docs/redesign-propozycje/wzorzec-app-feniks-v17.html` (kopia z App) + `/docker/leaders-of-teams-app/audyt/zrzuty/feniks-v17pro-*.png`.
Wytyczne: [WYTYCZNE-V17-PORTAL.md](WYTYCZNE-V17-PORTAL.md) · skill `portal-v17-design` · koordynacja: skill `portal-lider-dnia`.

**Feniks w Portalu:** logo i znak sieci tak; „Feniks dnia” jako licznik aktywności — nie (ADR-004/010). Odpowiednikiem jest Drabinka,
która świeci wyłącznie z cudzych ocen i uznanych odpowiedzi. Zatwierdza Maciej na makiecie P0.

## Procedura (kolejność nienegocjowalna)

Makieta (sesja Sonnet, worktree) → `recenzent-wygladu` bez P1 → zrzuty do Macieja (1512 jasny + 390) → akceptacja (wiersz niżej) →
kod za flagą `data-wyglad="v17"` (sesja Sonnet) → `zgodnosc-makiety` ZGODNY w 4 parach → `portal-bramki` → `portal-wdrozenie` (ręcznie, pod `flock /tmp/lot-v17-build.lock`).

## Paczki (inwentarz tras `apps/web/app`, 19.11)

| Paczka                 | Zakres (trasy)                                                                                                                    | Wzorzec                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **P0 fundament**       | rama: menu szyna↔panel + dolny pasek + arkusz, tło siatki, karta v17, tokeny, Instrument Serif; ekran `/panel` (zalogowany)       | Panel                    |
| P1 rynek               | `/zlecenia` (+`[id]`), `/uslugi` (+`[id]`), `/oferty`, `/firmy`, `/zapytania`, `/porownanie`                                      | Katalog / Karta obiektu  |
| P2 Liderzy i Drabinka  | `/liderzy` (+`[id]`), `/profil/[handle]`, `/drabinka`, `/droga`, `/panel/punkty`                                                  | Karta obiektu / Drabinka |
| P3 społeczność         | `/feed`, `/wpisy`, `/pytania`, `/watki`, `/grupy`, `/tematy`                                                                      | Wątek / Q&A              |
| P4 moje i konto        | `/panel/*` (oferty, usługi, zlecenia, zapisane, ulubione, konto, profil, zapros), `/powiadomienia`, `/weryfikacja`, `/firma/nowa` | Formularz / Panel        |
| P5 szukaj i moderacja  | `/szukaj`, `/panel/moderacja`, `/panel/analityka`, `/panel/uzytkownicy`                                                           | Katalog                  |
| P6 auth i stany        | `/logowanie`, `/rejestracja`, `/nie-pamietam-hasla`, `/reset-hasla`, `/offline`, 404, błąd, `loading`                             | Publiczne                |
| P7 publiczne i landing | `/`, `/dla-firm`, `/start`, `/regulamin`, `/prywatnosc`, `/wypis-digest`; scena 3D zostaje                                        | Publiczne                |

## Akceptacje ekranów (wpisuje Lider — bez wpisu ekran nie idzie do kodu)

| Ekran                                                                                       | Paczka | Data  | Cytat Macieja  | Zrzut                                                                                                             | Kod (commit) |
| ------------------------------------------------------------------------------------------- | ------ | ----- | -------------- | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| `/panel` (zalogowany) + rama: menu szyna↔panel, dolny pasek + arkusz, tło siatki, karta v17 | P0     | 19.11 | „Akceptuję P0” | `audyt/zrzuty/v17-panel-*.png` (gałąź `claude/dazzling-bose-0da725` @ `dd0456b`; recenzent-wygladu GOTOWE bez P1) | —            |

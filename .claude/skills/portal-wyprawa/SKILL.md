---
name: portal-wyprawa
description: Journey-testy Portalu LoT na prawdziwych danych produkcyjnych — konta-persony, rejestracja przez bramkę anty-bot, pełny cykl zlecenia i Q&A z minami anty-fraudu, dziennik obserwacji UX i sprzątanie z weryfikacją. Użyj, gdy trzeba przejść ścieżkę użytkownika end-to-end, gdy użytkownik mówi „przetestuj jak prawdziwy użytkownik", „przejdź drabinkę", „wyprawa", „dogfooding", „sprawdź czy to intuicyjne".
---

# Wyprawa — przejście ścieżki widzi więcej niż zrzut

Zrzut łapie jeden kadr; wyprawa łapie WĘDRÓWKĘ: gdzie się zawahałeś, czego nie znalazłeś,
ile kliknięć kosztował proces. Pierwsza wyprawa (22.08) znalazła w ten sposób rzeczy
niewidoczne z żadnego pojedynczego ekranu. Repo App doszło do tego samego wniosku
wcześniej — ten skill jest lustrem tamtejszego `audyt/` dla Portalu.

## Warsztat — nie pisz od zera

Wszystko w `wyprawa/`:

```js
import {
  otworz,
  zaloguj,
  zarejestruj,
  api,
  zrzut,
  spis,
  raport,
  KONTA,
  BASE,
} from '/docker/portal-staging/wyprawa/harness/harness.mjs';

const s = await otworz({ konto: 'lider', mobile: true }); // 390×844, pl-PL
await zaloguj(s); // cache sesji w /tmp/wyprawa-stan
await s.page.goto(BASE + '/panel', { waitUntil: 'load' }); // NIGDY networkidle (Socket.IO)
await zrzut(s.page, 'wyprawa-<etap>-390');
raport(s, 'tytuł'); // sieć /api (zapisy+błędy) + konsola, czyści bufory
```

- **Konta**: `KONTA` w harnessie + opisy person w `wyprawa/KONTA.md`. To persony —
  ZOSTAJĄ po sesji; przy liczeniu realnych użytkowników wykluczaj ich adresy.
- **`zarejestruj('klucz')`** przechodzi bramkę anty-bot po stronie Node'a
  (sha256 po kolei, odczekanie ≥2,3 s OD ODEBRANIA odpowiedzi, honeypot `nazwaFirmy`
  nieobecny). ⚠️ W przeglądarce bramka wymaga secure context — po IP kontenera
  rejestracja CICHO pada (mina `crypto.subtle` w MINY) — dlatego rejestrujemy przez API.
- **`api(s, 'POST', '/orders', {...})`** — wywołanie API w kontekście zalogowanej strony
  (cookie idzie samo; Portal nie używa nagłówka CSRF).
- **`bash wyprawa/monitor.sh 10`** — druga strona lustra: co baza i logi NAPRAWDĘ
  zapisały. „Klik przeszedł" bez wpisu w bazie = zgłoszenie.

## Rytm wyprawy

1. Krok wykonuj **w przeglądarce na 390 px** (mobile-first; 1440 jako kontrola).
2. Po każdym etapie: wpis do `wyprawa/dziennik.md` (szablon w pliku — także tarcie
   NIEBĘDĄCE błędem), błędy do `wyprawa/zgloszenia.jsonl` (schemat jak w App
   `AGENTS.md`, prefiks `W-`, wagę ostateczną nadaje prowadzący, nie agent).
3. `spis(page)` na nowym ekranie = surowiec inwentarza — „element, którego nie kliknąłem"
   to dług przebiegu.
4. Zrzut przy każdej zmianie stanu; patrz na niego OCZAMI (obcięcia, odmiana, łamanie).

## Cykl zlecenia — kolejność i strony

`/zlecenia/nowe` (firma) → publikacja i CAŁA reszta na `/zlecenia/[id]`:
oferta (Lider) → „Wybierz tę ofertę" (firma) → start → oddaj (Lider) → potwierdź (firma)
→ opinie OBU stron. **Opinie publikują się symultanicznie** — dopóki druga strona nie
wystawi swojej, pierwsza leży niewidoczna (jednostronna dopiero po 14 dniach). Punkt
`ORDER_COMPLETED_RATED` powstaje w sekundach po drugiej opinii — jako **PENDING
(karencja 7 dni, na twardo w kodzie)**.

## Miny anty-fraudu (zaprojektowane, nie przypadkowe)

- Punkty za zlecenie: **100/80/40** wg oceny 5/4/3 (≤2 → 0); **×0,5 gdy firma <14 dni**;
  **×0,5^n** za kolejne zlecenia od TEJ SAMEJ firmy (rotuj firmy!).
- **Wzajemność A↔B w 7 dni → HOLD** i sprawa moderacyjna. Q&A punktuje tylko JEDEN
  kierunek (pytający akceptuje odpowiedzi lidera — nigdy odwrotnie).
- Upvote liczy się tylko od konta **≥14 dni z własną aktywnością Q&A** — świeże konto
  głosuje w próżnię (0 pkt, zero wpisu).
- Limity: 5 punktowanych zdarzeń społ./dobę (6. → HOLD), 300 pkt community/tydzień,
  limity świeżego konta (order_publish 10/dobę itd.).
- Poziom 4+ wymaga **≥20% punktów z każdej ścieżki** — bez mentoringu nie ma Eksperta.

## Kompresja czasu (tylko konta wyprawy)

Karencja 7 dni + „firma <14 dni" czynią wspinaczkę wielotygodniową. Za zgodą właściciela
(22.08) przewijamy czas narzędziem `apps/api/prisma/wyprawa-czas.ts` — antydatuje
`createdAt` zdarzeń punktowych WYŁĄCZNIE kont z jawnej listy i uruchamia realne
`maturePendingPoints()`. Nigdy dla kont spoza `wyprawa/KONTA.md`. Backup bazy przed
pierwszym użyciem w sesji.

## Granice twarde

- **Macix (`kuchar21ski@gmail.com`), konta demo i wszystko `deleted-%` — nietykalne.**
- Zero maili (persony nie mają skrzynek; nic w Portalu tego nie wymaga — zmierzone).
- Zmiany danych poza kontami wyprawy = osobna zgoda właściciela.
- Treści person są PUBLICZNE — pisz je rzetelnie, jak człowiek, który naprawdę przeszedł
  ścieżkę. Zero wypełniaczy.

## Sprzątanie — z dowodem, nie z deklaracją

Konta-persony zostają. Wszystko INNE tymczasowe kasujesz, a na koniec pokazujesz dowód:

```bash
docker exec portal-prod-mysql-1 sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" portal -e "
SELECT email, displayName, DATE(createdAt) FROM users
WHERE email NOT LIKE \"%@demo.leadersofteams.pl\" AND email NOT LIKE \"deleted-%\";"'
```

Każdy adres z wyniku musi być albo realnym człowiekiem, albo pozycją z `wyprawa/KONTA.md`.
Trzeci przypadek nie istnieje — a jeśli istnieje, to jest twoje zgłoszenie.

## Wyjście skilla

Dziennik uzupełniony, zgłoszenia z wagami, zrzuty w `wyprawa/zrzuty/`, monitor bez
niespodzianek, dowód czystości kont. Obserwacje → HANDOFF-OPUS przy zamknięciu sesji.

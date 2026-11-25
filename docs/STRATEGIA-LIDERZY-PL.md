# Strategia: Portal przyciąga liderów z Polski (25.11.2026)

> Jeden ekran. Źródła: `strategy/DIFFERENTIATION-AND-GROWTH.md` (kierunek nadrzędny), `PROGRAM-DROGA-LIDERA.md`
> (PL0–PL5 na prodzie), `WYTYCZNE-V17-PORTAL.md` (wygląd), App: `docs/strategia/{BIZNES-PLAN-LOT,TWORCY-LOT}.md`.
> Zmiana tego pliku = rozmowa z Maciejem, nie decyzja w sprincie.

## Stan zmierzony (nie z pamięci)

- **Realni użytkownicy: 2.** Wejścia z Google: 0. Ruch: 99,6% bezpośredni (puls 01.11).
- Produkt jest gotowy na pierwszych ludzi: zlecenie gościa przed kontem, oferty z wątkiem, Drabinka,
  Q&A, grupy, huby 10 branż × 3, `/porownanie/*`, JSON-LD, `llms.txt`, mail powitalny, przypomnienie po 48 h.
- **Wąskim gardłem nie są funkcje, tylko ludzie i zaufanie:** katalog wypełnia demo, Search Console
  nie jest podpięte, nikt z 32 kandydatów `lejek-tworcow.csv` nie był pytany.

## Obietnica dla lidera z Polski

> **„Jedyne miejsce w Polsce, gdzie status lidera trzeba zapracować u drugiego człowieka.”**

- Rozwinięcie: Twój poziom rośnie tylko wtedy, gdy firma oceni Twoją pracę albo inny lider uzna Twoją odpowiedź.
  Zaproszenia, logowania i wpisy dają 0 pkt — reguły są jawne (`/drabinka`).
- Kontra wobec „kursów na status” i MLM („anty-Tate” z kierunku nadrzędnego) mówimy **faktem, bez nazwisk na stronie**.
- Konkret zamiast hasła (od 25.11 na landingu, w `/start` i w pustym `/panel/punkty`):
  **Adept = 100 pkt = jedna ocena 5/5 po zleceniu; uznana odpowiedź = 50 pkt; punkty dojrzewają 7 dni.**

**Czym jest Portal (Maciej 25.11):** „portal łączący to wszystko” — zlecenia jak Oferteo, usługi i poziomy jak Fiverr,
społeczność jak X, profil-dowód jak GitHub — plus własna możliwość, której nie ma nikt z nich: **Drabinka Lidera**.
Komunikat dla lidera: jedno miejsce, gdzie praca, reputacja i awans to ta sama rzecz.

## Dwa tory wejścia, jedno CTA na tor

| Tor   | Wejście                                           | Pierwszy ruch                                    | Dowód, że zadziałało               |
| ----- | ------------------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| Firma | `/` hero, `/dla-firm`, `/porownanie/*`            | opis zlecenia przed kontem → oferty              | zlecenie z ≥ 1 ofertą              |
| Lider | `/droga`, sekcja „Dla Liderów”, `/drabinka`, huby | profil → oferta do zlecenia albo odpowiedź w Q&A | pierwszy punkt w księdze (pending) |

Firma zostaje głównym CTA strony głównej (decyzja 21.10): bez zleceń Drabinka nie ma z czego punktować.

## Kanały za 0 zł — w kolejności dźwigni

1. **Pierwszy Krąg (20 osób)** z `lejek-tworcow.csv`: wiadomość wysyła Maciej osobiście, szkic dajemy my. Mówimy wprost,
   że Portal jest prawie pusty, i nie obiecujemy ruchu. Każda osoba dostaje jedno zadanie: profil + 1 usługa albo 1 odpowiedź.
2. **Ruch z sieci:** `leadersofteam.pl` → finał „Zostań Liderem” → `/drabinka`; App (stopka + link kontekstowy do Drabinki
   przy L5 „dostęp do App”). Wspólny `ecosystem.ts` jest bajt w bajt (od 25.11 także w Portalu), Organization `sameAs` na landingu.
3. **Search Console + Bing (D5)** — 10 minut Macieja: wpis DNS, zgłoszenie `sitemap.xml`. Bez tego huby branż są niewidoczne.
4. **Prawdziwe zlecenia HydroSpark (PL5.4)**: 3–5 sztuk w hubie „instalacje/operacje” — pierwsze realne strony z JobPosting.
5. **„Zaproś Lidera”** (`/panel/zapros`) — dopiero gdy zapraszający ma co pokazać; 0 pkt, bez zapisu w bazie (ADR-004).

## Kolejność warunków (nie przeskakiwać)

1. 5–10 prawdziwych profili i zleceń (Pierwszy Krąg + HydroSpark), żeby katalog nie wyglądał na martwy.
2. **D3: zdjęcie danych demo** — osobna zgoda Macieja (25.11: „nie teraz”).
3. Zaproszenie testerów (`/root/docs/TESTERZY-I-SPOLECZNOSC.md`: 3 firmy + 2 Liderów).
4. Nowy wygląd V17 „Światło” włączany flagą dopiero, gdy jest kogo nim przywitać.

**Miara 30 dni:** ≥ 20 realnych kont (bez `@demo.leadersofteams.pl` i `deleted-*@deleted.invalid`), ≥ 5 pierwszych akcji
(oferta albo uznana odpowiedź), ≥ 1 wejście z Google dziennie, 30% powrotów po 7 dniach (`/panel/analityka`).
Tygodniowy wpis w `dziennik-pulsu.md` (skill `lider-lot`).

## Czego nie robimy

- Płatnych kanałów, reklam, zewnętrznych API (ADR-009); punktów za polecenia, zaproszenia ani aktywność (ADR-004).
- Stron miast („lider sprzedaży Warszawa”) przy pustym katalogu — byłyby cienką treścią. Wracamy do nich przy ≥ 30 profilach.
- Sceny 3D „Światło z cudzych rąk” i nowych funkcji przed pierwszymi realnymi liderami (biznesplan: zamrożenie 3D).
- `academy`, `referral`, `billing` — dopiero po dojrzałym MVP i realnych użytkownikach (ROADMAP).

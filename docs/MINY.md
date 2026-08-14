# Miny — pułapki, które w tym repo już kosztowały czas

Nie teoretyczne. Każda pozycja wydarzyła się naprawdę i jest opisana tak, żeby dało się ją
rozpoznać **po objawie**, zanim się zdiagnozuje przyczynę.

---

## Weryfikacja i testy

### „Backend gotowy" ≠ „funkcja działa"

Poczta była odhaczona jako zrobiona na podstawie logu `mail.sent`. Nikt nie kliknął linku.
Okazało się, że **nie istniały ani `/weryfikacja`, ani `/reset-hasla`**, a `/logowanie`
nie miało nawet linku „nie pamiętam hasła". Reset hasła — zamknięty jako bloker pierwszej
mili — był martwy przez tydzień.

**Zasada:** jeśli funkcja ma ścieżkę użytkownika, PRZEJDŹ JĄ. Nie sprawdzaj samego API.

### Zielony test przez POMINIĘCIE

Testy integracyjne mają `describe.skipIf(!hasInfra)`. Bez `DATABASE_URL`/`REDIS_URL` cała
suita świeci na zielono, nie sprawdzając niczego. **Patrz na liczbę wykonanych testów**
(stan 2026-08-14: 170 API + 15 e2e), nie na kolor.

Wariant tej samej miny: test anty-MLM był zielony, bo jego ścieżka **nie zawierała** nowej
funkcji. Strażnik strzeże wyłącznie tego, przez co realnie przeszedł — skill `portal-anty-mlm`.

### Sukces „przez nieobecność" w e2e

Helper `submitReview` uznawał sukces po ZNIKNIĘCIU pola oceny, a element w trakcie nawigacji
też jest ukryty. Meldował sukces bez wysłania oceny, a test padał kilka kroków dalej,
w miejscu niezwiązanym z przyczyną. **Kotwicz na pozytywnym śladzie i lokatorem, nie tekstem.**

### Lawina czerwonych testów = sierota na porcie

Zanim zaczniesz czytać kod: `ss -ltnp | grep :3000`. Proces `next-server` przeżywa
`pkill -f "next start"` — trzeba zabić po PID. Testy przeciwko poprzedniemu buildowi
objawiają się niezrozumiałymi błędami w losowych miejscach.

### Tryb strict Playwrighta

„Zaloguj się" występuje w nagłówku, treści i stopce naraz. Zawężaj do
`page.getByRole('main')`, inaczej lokator łamie się na trzech dopasowaniach.

---

## Infrastruktura

### Nazwa `api` jest DWUZNACZNA na tym serwerze

Staging i produkcja dzielą sieć Traefika `n8n_default`, a compose nadaje każdej usłudze alias
równy jej nazwie. `portal-staging-web` rozwiązywał `api` na kontener **produkcyjny** —
staging pokazywał dane produkcji, a każda weryfikacja „na stagingu" mogła być weryfikacją
produkcji. Naprawione aliasem `api-staging`.

**Objaw:** dane są w bazie, API je zwraca, a strona pokazuje pustkę.

### `API_INTERNAL_URL` jest zapiekany w buildzie

Cel rewrite'u `/api/*` siedzi w `routes-manifest.json`. Zmiana samego env poprawia wyłącznie
SSR — ruch z komponentów klienckich nadal idzie pod stary adres. To samo dotyczy każdej
zmiennej `NEXT_PUBLIC_*`. **Wymagany `docker compose build web`.**

### Pliki zapisane do wolumenu spoza kontenera są root-owned

API działa jako `node` → EACCES i **500 przy każdym uploadzie**, przy działającej reszcie
Portalu. Zdarzyło się po seedzie z hosta. Po każdej takiej operacji:
`docker exec -u root portal-prod-api-1 chown -R node:node /app/uploads`.
Kontrola: pole `uploads` w `/healthz`.

### `run --rm migrate` to OSOBNY krok

Usługa stoi za `profiles: [tools]` i nie startuje sama. Objaw pominięcia: `P2022 column
does not exist` w logach api po wdrożeniu.

### Cicha śmierć workera

Zdarzenie bez konsumenta kończy się „sukcesem", więc objawem jest CISZA: wpisy nie pojawiają
się w feedzie, powiadomienia nie przychodzą, punkty nie dojrzewają — a `docker ps` pokazuje
„Up". Dlatego istnieje puls (`worker.alive` w `/healthz`) odnawiany **tylko gdy obraca się
pętla dispatchera**, więc łapie też workera żywego, ale zakleszczonego.

### `tsx` nie istnieje w obrazie produkcyjnym

Obraz to `pnpm --prod deploy`. Skrypty jednorazowe (seed) uruchamiaj z repo na hoście,
celując w IP kontenera bazy.

---

## Baza

### `prisma migrate dev` nie działa (brak TTY)

Generuj przez `migrate diff --script` **do pliku POZA katalogiem migracji**. Pusty plik
w `migrations/` blokuje sam siebie (`1065 Query was empty`) i wszystkie kolejne migracje;
naprawa przez `migrate resolve --rolled-back`.

### MySQL trzyma ENUM jako liczbę porządkową

Nowe wartości **wyłącznie na końcu** listy. Wstawienie w środek po cichu przemapuje
istniejące wiersze — bez błędu i bez ostrzeżenia. Czytaj wygenerowany `ALTER … MODIFY … ENUM`
oczami przed commitem.

### Baza dev jest współdzielona i akumuluje resztki

Test szukający „pierwszego pasującego rekordu" prędzej czy później trafi na resztkę po
przerwanym przebiegu. Zawężaj do własnego przebiegu (`const run = Date.now()`) i sprzątaj.

### Rola użytkownika jest zamrożona w migawce sesji

`UPDATE users SET role='MODERATOR'` **nie działa**, dopóki ta osoba się nie przeloguje —
do tego czasu widzi 403. Kosztowało 5 czerwonych testów, zanim przyczyna stała się jasna.

---

## Kod i UI

### Zrzut ekranu widzi więcej niż test

Złapane wyłącznie na zrzucie, przy zielonych testach: odwrócona szyna postępu, monospace
w kompozytorze (`textarea` poza `.field` nie dziedziczy fontu), obcięty link przez `truncate`
na 390 px, łamiący się uchwyt w karcie cytatu, błąd gramatyczny „na Portalu od 3 miesiące".
`innerText` nie widzi obcięcia przez CSS.

### `const` nie jest hoistowany

`SOCIAL_POST_MAX_IMAGES` było zdefiniowane niżej niż jego pierwsze użycie w tym samym module
kontraktów — schemat wywracał moduł na starcie. Stałe współdzielone trzymaj w sekcji wspólnej,
na górze pliku.

### Lista rodzajów plików w trzech miejscach

`FileKind` (Prisma), `fileKindSchema` (kontrakty) i `KINDS` (trasa uploadu) muszą iść w parze.
Rozjazd objawia się **400 przy uploadzie mimo poprawnie zmigrowanej bazy**.

### Latencja sieci a progi czasowe

Bramka anty-bot odrzucała `TOO_FAST`, bo klient odliczał minimalny czas wypełniania formularza
od **wysłania** żądania o wyzwanie, a serwer od jego **utworzenia** — o całą latencję później.
Progi czasowe licz od momentu, który obie strony widzą tak samo.

### `crypto.subtle` nie istnieje poza bezpiecznym kontekstem

`about:blank` wywala się na `undefined`. HTTPS, `127.0.0.1` i `localhost` są OK.

### FormData i `content-type`

Nie ustawiaj ręcznie `content-type` przy `FormData` — przeglądarka MUSI sama dodać granicę
multipart, inaczej upload psuje się po cichu. `apiFetch` już to obsługuje.

---

## Produkt

### Konta testowe liczone jako realni użytkownicy

Raport „3 realne konta na produkcji" był nieprawdą — wszystkie trzy zostały po poprzednich
sesjach. **Sprzątaj po sobie** i przed policzeniem użytkowników sprawdź domeny adresów.

### Dokumentacja bywa za kodem

W jednej sesji trzy razy: „digest do zrobienia" (był), „ślad zaufania na kartach do zrobienia"
(był), „kod anty-bota gotowy, brakuje kluczy" (klucz nie miał jak trafić do obrazu).
**Potwierdzaj w kodzie, nie w docs** — również listy „✅".

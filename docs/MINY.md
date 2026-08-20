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

### `waitFor` nie odświeży strony renderowanej na serwerze

Powiadomienie powstaje dopiero, gdy worker przetworzy zdarzenie. `page.goto()` + `waitFor()`
na element nigdy go nie zobaczy: strona jest już wczytana, a Next nie dociągnie nowego
rekordu sam. **Ponawiaj WEJŚCIE (`goto` w pętli), nie czekaj na element.** Objaw: funkcja
działa (rekord jest w bazie, worker zalogował „Zdarzenie przetworzone"), a test/skrypt
uparcie melduje brak.

### `waitForURL(/regex/)` dopasowuje TAKŻE bieżący adres

`waitForURL(/\/grupy\/[a-z0-9]+$/)` po kliknięciu na `/grupy/nowa` przechodzi natychmiast —
bo `nowa` też pasuje do wzorca. Skrypt jedzie dalej z adresem formularza zamiast adresu
utworzonego zasobu i wywala się kilka kroków później, w niezwiązanym miejscu. Wykluczaj
stronę startową wprost (predykat zamiast wyrażenia regularnego).

### `.first()` na liście, w której akcja zmienia liczbę kontrolek

Po awansie drugiej osoby na moderatora obie mają przycisk „Odbierz moderację", a `.first()`
to wiersz WŁASNY — kliknięcie odbierało uprawnienia sobie i sekcja znikała ze strony.
Celuj w wiersz (`locator('.list-row').filter({ hasText: nazwa })`), nie w „pierwszy taki
przycisk na stronie". Przy okazji: to był sygnał, że akcja na własnym wierszu potrzebuje
innej nazwy i potwierdzenia — dziś nazywa się „Zrezygnuj z moderacji".

### Tryb strict Playwrighta

„Zaloguj się" występuje w nagłówku, treści i stopce naraz. Zawężaj do
`page.getByRole('main')`, inaczej lokator łamie się na trzech dopasowaniach.

---

## Infrastruktura

### Deploy prod BEZ `--env-file .env.prod` podmienia środowisko wszystkim kontenerom

(20.08) Wywołanie `docker compose -p portal-prod -f … up -d` spoza `infra/` i bez
`--env-file .env.prod` NIE kończy się błędem: compose bierze domyślne `infra/.env` (dev),
uznaje, że konfiguracja się zmieniła, i PRZETWARZA wszystkie kontenery — łącznie z mysql.
API wstaje z poświadczeniami dev do bazy prod → `unhealthy`, produkcja leży do czasu
poprawnego wywołania (dane w wolumenie nietknięte). **Komendy wdrożenia kopiuj ze skilla
`portal-wdrozenie` co do znaku — z `cd /docker/portal-staging/infra` i `--env-file` włącznie.**

**Objaw:** `run --rm migrate` kończy się „provide valid database credentials", choć nic
w bazie się nie zmieniało; `mysql` ma nagle status „Up X seconds".

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

### Sonda kontenera liczona jako odsłona

Healthcheck `web` uderzał w `/` co 15 s i **był liczony jako wejście użytkownika**:
na produkcji `/` miało **3926 odsłon na dobę**, a każda inna strona 2–3. Filtr botów
w middleware go nie odsiewał, bo `fetch` z Node przedstawia się jako `node`, a nie jako
crawler. **Objaw:** jedna strona ma trzycyfrową przewagę nad wszystkimi pozostałymi,
a liczba dzieli się mniej więcej przez interwał sondy (86 400 / 15 = 5760).

Sonda celuje dziś w `/healthz`, **wykluczone z matchera middleware** — nie z białej listy
ścieżek, bo wtedy kłamstwo przeniosłoby się z `/` na wiadro `/inne`. Trasa jest
`force-dynamic`: statyczna odpowiedź dowodziłaby tylko, że serwer oddaje plik, a poprzednia
sonda dowodziła, że Next RENDERUJE.

### Plik w `public/` przesłania trasę z `app/`

`apps/web/public/robots.txt` (trzy linijki sprzed Sprintu G1) wygrywał z generowanym
`app/robots.ts` — Next serwuje statyki przed trasami. Przez miesiąc produkcja twierdziła
co innego niż kod: `/logowanie` i `/rejestracja` NIE były wyłączone z indeksacji, a linia
`Sitemap:` nigdy nie trafiła do crawlerów, choć cała praca nad odkrywalnością zakładała,
że trafia. **Objaw:** `robots.txt` z produkcji ma „User-agent" małą literą (tak pisze
człowiek) i **nie ma linii `Host:` ani `Sitemap:`** — generator Next zawsze je dokłada
i pisze „User-Agent". Pilnuje tego test w `shared/web-contract.test.ts`.

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

### Skrót `background` kontra późniejsza warstwa stylów

`globals.css` ustawiał wypełnienie przycisku skrótem `background: linear-gradient(…)`,
a warstwa `climb.css` dokładała „połysk" regułą `.btn:not(.secondary) { background-image: … }`
o **wyższej swoistości**. `background-image` skasował obrazek ze skrótu, a skrót wcześniej
wyzerował `background-color` — więc **KAŻDY główny przycisk Portalu był przezroczysty**
(zmierzone: `rgba(0, 0, 0, 0)`). „Filtruj", „Utwórz konto" i „Zaloguj się" renderowały się
jako sam biały napis. Nikt tego nie zgłosił, bo biały tekst na ciemnym tle nadal się czyta.

**Zasada:** wypełnienie trzymaj w zmiennej (`--btn-fill`) i dokładaj efekty JAKO KOLEJNĄ
WARSTWĘ (`background-image: shine, var(--btn-fill)`), nigdy zamiast poprzedniej. Dodatkowo
ustaw `background-color` jako siatkę bezpieczeństwa. **Objaw:** przycisk wygląda jak zwykły
pogrubiony tekst. Sprawdzenie to jedna linia w konsoli — `getComputedStyle(el).backgroundColor` —
i tylko zrzut albo pomiar to złapie, żaden test.

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

### Trasa API bez wejścia w interfejsie

`POST /groups` istniała od Sprintu 4 z pełną bramką poziomu 2 i testami — i przez cztery
sprinty NIE MIAŁA w całej aplikacji ani jednego linku. Grupę dało się założyć wyłącznie
curl-em, więc na produkcji były same grupy systemowe z seeda: bez założyciela, czyli bez
ani jednego moderatora. **Nowa trasa bez wejścia w UI to funkcja, której nie ma.**
Ten sam wzorzec co martwy reset hasła — tylko cichszy, bo nikt nie dostaje 404.

**Od S18 pilnuje tego test:** `shared/web-contract.test.ts` porównuje trasy z
`modules/*/routes.ts` z literałami ścieżek w `apps/web`. Przy pierwszym uruchomieniu
znalazł SZEŚĆ martwych tras — cztery znane (`/me/export`, `DELETE /me`, `/me/favorites`,
`/me/social`) i **dwie, o których nikt nie wiedział**: `POST /offers/:id/withdraw`
(złożonej oferty nie dało się wycofać) oraz `PATCH /listings/:id` (opublikowanej usługi
nie da się edytować — otwarte, w S21). Dopisując wyjątek, dopisz też uzasadnienie:
test wywala się na wyjątku wskazującym trasę, która już nie istnieje.

### Dokumentacja bywa za kodem

W jednej sesji trzy razy: „digest do zrobienia" (był), „ślad zaufania na kartach do zrobienia"
(był), „kod anty-bota gotowy, brakuje kluczy" (klucz nie miał jak trafić do obrazu).
**Potwierdzaj w kodzie, nie w docs** — również listy „✅".

### Zdublowany Content-Type daje 415 przy zielonych testach (19.08)

`apiFetch` sam ustawia `content-type: application/json`, gdy jest body. Komponent, który
dodatkowo przekazał `headers: { 'Content-Type': … }`, tworzył w obiekcie nagłówków DWA
klucze różniące się wielkością liter — fetch skleja je do
`application/json, application/json`, a Fastify odpowiada **415** na każdy POST.
Testy integracyjne były komplet zielone, bo `app.inject` nie idzie przez fetch
przeglądarki. **Nie ustawiaj Content-Type w wywołaniach `apiFetch` — i przechodź ścieżkę
w przeglądarce, nie tylko injectem.**

### Wystawiony dev Redis został realnie przejęty (18.08)

`portal-dev-redis-1` (port 6379 na świat, bez hasła — ryzyko akceptowane przez właściciela)
dostał 18.08 07:03 UTC komendę `SLAVEOF 175.24.232.83:26738` z zewnątrz i stał się repliką
tylko-do-odczytu. Objaw: cała suita testów pada na
`READONLY You can't write against a read only replica` — wygląda jak zepsuty kod, a to
incydent. Diagnoza: `redis-cli info replication` (rola `slave` + obcy `master_host`).
Naprawa: `redis-cli slaveof no one` + sprawdź `config get dir/dbfilename` (atak przez
`CONFIG SET` pisze pliki poza /data) i `docker logs` po `REPLICAOF enabled`.

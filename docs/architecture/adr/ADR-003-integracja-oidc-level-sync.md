# ADR-003: Integracja z app.leadersofteams.com — logowanie i synchronizacja poziomów

**Status:** Zaakceptowany
**Data:** 2026-07-04

## Kontekst

Brief rozstrzyga: dwie osobne bazy danych, dwa osobne konta; leadersofteams.pl pełni rolę dostawcy tożsamości ("Zaloguj przez leadersofteams.pl") i jest **jedynym źródłem prawdy o poziomie użytkownika**; app.leadersofteams.com jest konsumentem tej informacji (tam znajduje się nagroda: darmowy dostęp + możliwość założenia zespołu). Otwarte pytania briefu (sekcja 4 i 7, pyt. 1–2): protokół logowania (pełny OIDC vs uproszczony) oraz mechanizm propagacji awansu i obsługa rozjazdów danych.

## Decyzja 1: Protokół logowania — standardowy OAuth 2.0 / OIDC (Authorization Code + PKCE)

Portal implementuje rolę **OpenID Provider** przy użyciu biblioteki [`oidc-provider`](https://github.com/panva/node-oidc-provider) (node, certyfikowana implementacja OpenID). app.leadersofteams.com implementuje rolę **Relying Party** standardowym klientem (`openid-client`).

- Flow: Authorization Code + PKCE, bez implicit/hybrid.
- Klienci rejestrowani statycznie w bazie portalu (tabela `OidcClient`) — na start jeden klient (app), architektura gotowa na kolejne brandy ekosystemu (HydroSpark, Zodiamo…).
- ID token / endpoint `userinfo` niesie niestandardowe claims: `lot_level` (int 0–7), `lot_leader_status` (bool — czy użytkownik ma tytuł Lidera), `lot_industry`.
- Konta pozostają osobne: app przy pierwszym logowaniu przez portal tworzy **lokalne konto powiązane** po `sub` (stabilny identyfikator z portalu) i przechowuje mapowanie `portal_sub → app_user_id`. Zero współdzielenia haseł i sesji.

**Dlaczego nie uproszczony własny protokół:** własny mechanizm (podpisany token w redirect) nie jest realnie prostszy — trzeba samemu rozwiązać rotację kluczy, replay, CSRF na callbacku, expiry, odwołanie dostępu. `oidc-provider` + `openid-client` dają to w konfiguracji, są audytowane i znane każdemu, kto kiedyś podłączał "Login with Google". Dodatkowo standard skaluje się na kolejne aplikacje ekosystemu bez nowego projektowania.

## Decyzja 2: Propagacja poziomu — trzy redundantne warstwy

Poziom w app.leadersofteams.com jest **kopią cache**; prawda jest zawsze w portalu.

| Warstwa          | Mechanizm                                                                                                                                                                                                                                                                   | Latencja       | Rola                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------- |
| 1. Login-time    | claim `lot_level` w ID token/userinfo przy każdym logowaniu przez portal                                                                                                                                                                                                    | przy logowaniu | samonaprawa przy każdej wizycie     |
| 2. Push          | webhook `POST /webhooks/lot-portal/level-changed` przy awansie; payload podpisany HMAC-SHA256 (wspólny sekret), idempotency key = id zdarzenia `LevelAchievement`; wysyłka przez BullMQ z retry i backoffem wykładniczym (do 24 h), po wyczerpaniu → alert + kolejka ręczna | sekundy        | natychmiastowe odblokowanie nagrody |
| 3. Rekoncyliacja | nocny job po stronie app: `GET /api/integration/levels?since=<cursor>` (paginowany, autoryzacja tokenem serwer-serwer) — app porównuje i koryguje wszystkie rozjazdy                                                                                                        | ≤ 24 h         | gwarancja spójności ostatecznej     |

Zasady rozstrzygania rozjazdów:

- **Awans nie dotarł** → naprawi go warstwa 1 (następne logowanie) lub 3 (najbliższa noc). Użytkownik nigdy nie musi zgłaszać ticketu, żeby dostać nagrodę należną od > 24 h.
- **App pokazuje wyższy poziom niż portal** (np. korekta antyfraudowa, ADR-004) → warstwy 1 i 3 obniżają kopię; odebranie dostępu do już założonego zespołu w app jest decyzją produktową app (rekomendacja: zespół zostaje w trybie read-only, nowe zaproszenia zablokowane).
- Webhook **nigdy nie jest jedynym** nośnikiem prawdy — jego utrata nie powoduje trwałego rozjazdu.

## Decyzja 3: Kierunek zależności

Portal **nie woła** app.leadersofteams.com przy swoich operacjach domenowych (żadnych synchronicznych zależności w ścieżce request/response). Cała integracja jest asynchroniczna i jednokierunkowa (portal → app), poza logowaniem OIDC, gdzie inicjatorem jest app. Awaria app nie ma żadnego wpływu na działanie portalu i odwrotnie.

## Konsekwencje

- (+) Odpowiedź na pytania 1 i 2 briefu; wzorzec działa dla kolejnych aplikacji ekosystemu bez zmian.
- (+) Brak SPOF między aplikacjami; spójność ostateczna z gwarantowanym horyzontem ≤ 24 h i samonaprawą przy logowaniu.
- (−) Wymaga prac po stronie app.leadersofteams.com (klient OIDC, webhook receiver, job rekoncyliacji) — zaplanowane jako faza 2 (ROADMAP.md), z wyprzedzeniem uzgodnione z zespołem app.
- (−) `oidc-provider` wymaga trwałego storage grantów (tabele w MySQL portalu) i rotacji kluczy JWKS — ujęte w modelu danych i runbooku.

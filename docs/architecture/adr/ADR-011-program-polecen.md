# ADR-011: Program Poleceń — afiliacja jednopoziomowa (firewall anty-MLM)

**Status:** Zaproponowany (kierunek zaakceptowany przez właściciela 2026-07-08)
**Data:** 2026-07-08
**Decydenci:** Maciej Kucharski (wymóg biznesowy: „zarabianie na zaproszeniach, ale nie MLM"), Opus 4.8 (projekt)
**Powiązane:** [brief §6](../../../brief-leadersofteams-platforma.md) · [ADR-004](ADR-004-ledger-punktowy-i-antyfraud.md) · [ADR-002](ADR-002-modular-monolith.md) · [ADR-013](ADR-013-monetyzacja-platnosci.md) · [strategia](../../strategy/DIFFERENTIATION-AND-GROWTH.md)

## Kontekst

Właściciel chce dać użytkownikom możliwość **zarabiania na zaproszeniach** jako dźwignię wzrostu sieci,
przy twardym warunku: **to nie może być MLM** (brief §6, ryzyko R-02). Cała architektura Drabinki jest
zaprojektowana anty-MLM (ADR-004) i ta obietnica jest nienaruszalna. Potrzebny jest mechanizm, który
nagradza polecenia pieniężnie, ale konstrukcyjnie NIE jest piramidą i NIE dotyka Drabinki.

Rozstrzygnięcie właściciela: **afiliacja jednopoziomowa** — wypłata za pierwszą realną transakcję
zaproszonego, zero „downline", zero punktów Drabinki.

## Decyzja 1: Polecenia żyją w Płaszczyźnie Pieniądza, nigdy w Statusie

Zgodnie z modelem Trzech Płaszczyzn ([strategia §4](../../strategy/DIFFERENTIATION-AND-GROWTH.md)):
polecenia to wyłącznie mechanizm **pieniężny** (Płaszczyzna B). **Zaproszenie, rejestracja zaproszonego,
jego aktywność ani jego własne polecenia nie generują ani złotówki poza jedną, jednorazową nagrodą
afiliacyjną — i ZERO punktów Drabinki (Płaszczyzna A).** Enum `PointEventType` (ADR-004) pozostaje
zamknięty i bez zmian.

## Decyzja 2: Pięć reguł, które czynią to afiliacją, a nie MLM

Mapowanie 1:1 na diagnostykę MLM (co naprawdę tworzy piramidę):

| Cecha MLM                               | Reguła LoT (egzekwowana konstrukcją)                                                                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nadpłaty wielopoziomowe od „downline"   | **Głębokość = 1, twardo.** `Referral` wiąże dokładnie jednego zapraszającego z jednym zaproszonym. Brak `parentReferralId`, brak drzewa. Polecenia zaproszonego **nigdy** nie płacą pierwotnemu zapraszającemu. |
| Płatność za samą rekrutację/rejestrację | **Wyzwalacz = pierwsza kwalifikowana transakcja** zaproszonego (pierwszy zakup płatnego kursu **lub** pierwsze rozliczone płatne zlecenie). Bez transakcji → bez wypłaty.                                       |
| Dochód pasywny/rekurencyjny z sieci     | **Jednorazowość.** Dokładnie jedna nagroda na parę (zapraszający, zaproszony), za pierwszą transakcję. Nie od kolejnych zakupów, nie cyklicznie.                                                                |
| Pay-to-play / kupowanie wejścia         | **Zapraszanie darmowe, bez buy-in.** Zarobek wymaga, by zaproszony sam z siebie dokonał zakupu realnej wartości.                                                                                                |
| Ranga/status zależny od struktury       | **Zero punktów Drabinki.** Zaproszenia nie zmieniają poziomu ani żadnej metryki merytorycznej.                                                                                                                  |

Nagroda jest **ograniczona i jawna** (kwota stała lub mały % pierwszej transakcji z sufitem — kalibracja
w ADR-013), a zasady publiczne na stronie portalu (transparentność jak przy Drabince).

## Decyzja 3: Cykl życia nagrody — karencja i clawback

Analogicznie do cyklu punktu w Drabince (ADR-004), ale w pieniądzu:

```
zaproszony dokonuje 1. transakcji → ReferralReward(PENDING)
        → [okno karencji = okno zwrotu/reklamacji] → CONFIRMED → wypłata (ADR-013)
                    ├─ zwrot / chargeback / odstąpienie 14 dni → REVERSED (clawback)
                    └─ sygnał antyfraudowy (self-invite/farma) → HOLD → moderacja → VOID lub CONFIRMED
```

Karencja spina się z 14-dniowym prawem odstąpienia od zakupu kursów (ADR-013): nagroda utrwala się
dopiero, gdy transakcja jest nieodwracalna. To zamyka wektor „kup → odbierz afiliację → zwróć".

## Decyzja 4: Guardraile antyfraudowe (reużycie modułu `antifraud`)

Program poleceń dokłada realny bodziec pieniężny, więc wymaga tych samych klas obrony co ledger:

- **Self-invite / konta-słupy**: heurystyki wspólnego fingerprintu/IP/urządzenia, świeżość konta
  zaproszonego, brak realnej aktywności poza pojedynczą transakcją → `HOLD` + `ModerationCase`.
- **Wzajemność (A zaprasza B, B zaprasza A)** w krótkim oknie → `FraudSignal` typu `RECIPROCITY_REFERRAL`
  → `HOLD`.
- **Próg dojrzałości**: nagroda z transakcji od konta młodszego niż próg wchodzi z `HOLD` do rozstrzygnięcia.
- **Limit szybkości**: dzienny/tygodniowy sufit liczby nagradzanych poleceń na zapraszającego (jak czapki
  Q&A) — chroni przed farmami.

Detektory żyją w module `antifraud` (jeden punkt audytu), konsumując zdarzenia `referral.*` i `billing.*`.

## Decyzja 5: Granica z Drabinką (rozszerzenie zasady anty-MLM, ADR-002 §5 / ADR-010 dec. 4)

**Moduł `referral` nie emituje żadnego zdarzenia konsumowanego przez `ladder`.** `ladder` subskrybuje
wyłącznie `marketplace.*`/`community.*` — `referral.*` (jak `groups.*`/`teams.*`/`academy.*`) tam nie
trafia. Egzekwowane w `subscriptions.test.ts` (test rozszerzony o dowód braku prefiksu `referral.`).
Zdarzenia `referral.*` konsumują wyłącznie `notifications` i `billing`.

## Model danych (schemat-forward — budowany wraz z płatnościami, ADR-013)

- **Referral** — `inviterUserId`, `inviteeUserId` (unikat: jeden zapraszający na zaproszonego),
  `code` (link zapraszający), `status` (`PENDING/QUALIFIED/EXPIRED`), `createdAt`. **Brak pola
  wskazującego rodzica/łańcuch** — głębokość 1 jest niereprezentowalna w schemacie.
- **ReferralReward** — `referralId`, `triggeringType` (`COURSE_PURCHASE`/`ORDER_SETTLED`),
  `triggeringId`, `grossValue`, `rewardAmount`, `status` (`PENDING/CONFIRMED/REVERSED/VOID`),
  `createdAt`, `confirmedAt`. Jednorazowość egzekwowana unikatem na `referralId`.

Moduł `referral` z publicznym API `index.ts` (granice ADR-002), zdarzenia przez outbox
(`referral.invited`, `referral.qualified`, `referral.reward_confirmed`, `referral.reward_reversed`).

## Konsekwencje

- (+) Realna dźwignia wzrostu (afiliacja twórców — legalna, znana mechanika), bez ryzyka bycia piramidą.
- (+) Wymóg anty-MLM pozostaje niemożliwy do obejścia bez jawnej zmiany schematu i ADR — polecenia
  fizycznie nie mogą stać się wielopoziomowe ani zasilić Drabinki.
- (+) Clawback + karencja czynią program odpornym na „kup i zwróć" oraz chargebacki.
- (−) Bodziec pieniężny = nowy wektor nadużyć (farmy kont) — mitygacja: guardraile Decyzji 4 (R-14 w RISKS).
- (−) Wymaga działających płatności i wypłat (ADR-013) — dlatego implementacja jest po wejściu PSP, nie w MVP.
- Kalibracja kwoty nagrody i okna karencji: kamień decyzyjny właściciela (w ADR-013).

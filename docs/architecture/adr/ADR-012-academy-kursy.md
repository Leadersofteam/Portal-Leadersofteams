# ADR-012: Academy — moduł kursów (nauka, kredencjały, bez punktów Drabinki)

**Status:** Zaproponowany (kierunek zaakceptowany przez właściciela 2026-07-08)
**Data:** 2026-07-08
**Decydenci:** Maciej Kucharski (wymóg: sprzedaż kursów, nauka, rozwój), Opus 4.8 (projekt)
**Powiązane:** [ADR-004](ADR-004-ledger-punktowy-i-antyfraud.md) · [ADR-002](ADR-002-modular-monolith.md) · [ADR-010](ADR-010-grupy-zespoly-case-studies.md) · [ADR-013](ADR-013-monetyzacja-platnosci.md) · [RISKS R-06/R-16](../../RISKS.md) · [strategia](../../strategy/DIFFERENTIATION-AND-GROWTH.md)

## Kontekst

LoT ma być siecią, w której można **się uczyć, rozwijać i sprzedawać kursy** — pierwszy etap drogi
lidera („ucz się → udowodnij → wspinaj się"). Academy pełni trzy role: (1) magnes na aspirujących
liderów, (2) lek na cold-start dwustronnego rynku (R-06 — treść żyje, zanim marketplace ma płynność),
(3) źródło przychodu dla twórców i platformy (ADR-013).

Kluczowe napięcie: nauka nie może stać się „farmą statusu". Modele typu „ukończ kurs → dostań punkty →
awansuj" to dokładnie pułapka engagementu, przed którą chroni brief §6. Rozstrzygnięcie właściciela:
**kursy zostają w warstwie pieniądz + reputacja; nie dają punktów Drabinki.**

## Decyzja 1: Kursy w Płaszczyźnie Pieniądza i Uznania, nigdy Statusu

- **Sprzedaż kursu** = Płaszczyzna B (pieniądz): prowizja platformy, wypłata autorowi przez PSP (ADR-013).
- **Ukończenie/ocena kursu** = Płaszczyzna C (uznanie): **odznaka umiejętności** (`SkillCredential`) i
  reputacja autora — osobne od poziomu Drabinki.
- **Konsumpcja/ukończenie kursu = 0 punktów Drabinki.** Enum `PointEventType` (ADR-004) bez zmian.
  Uczenie się nie jest „uznaną przez innego człowieka dostarczoną wartością" w sensie ledgera — jest
  konsumpcją; punktowanie jej otworzyłoby wektor engagement-farmingu.

> Uwaga projektowa: nauczanie (a nie konsumpcja) jest bliskie mentoringowi, który JEST punktowany
> (ścieżka `community`). Świadomie jednak **nie** dodajemy typu `COURSE_RATED` do Drabinki na tym etapie
> — jakość nauczania mierzymy reputacją autora (oceny od realnych kupujących), nie poziomem. Ewentualne
> punktowanie nauczania w przyszłości wymagałoby rewizji ADR-004 i osobnej zgody właściciela (obecnie:
> świadomie poza punktami).

## Decyzja 2: Bramka publikacji i jakość treści

- **Publikacja kursu od zdefiniowanego poziomu Drabinki** (parametr konfiguracyjny, jak grupy — start
  np. lvl 2), żeby przy otwartej rejestracji nie zalać Academy spamem (R-13/R-16). Bramka czyta
  `LadderState.level` przez publiczne API `ladder` (odczyt dozwolony, jak w `marketplace`/`groups`).
- **Kursy darmowe i płatne** (`price = 0` dozwolone) — darmowe napędzają lejek, płatne monetyzują.
- **Moderacja i reklamacje** (R-16): przycisk „zgłoś" na kursie → `ModerationCase`; 14-dniowe prawo
  odstąpienia dla treści cyfrowych spina się z clawbackiem afiliacji (ADR-011) i polityką zwrotów (ADR-013).

## Decyzja 3: Granica z Drabinką (zasada anty-MLM, ADR-002 §5)

**Moduł `academy` nie emituje żadnego zdarzenia konsumowanego przez `ladder`.** Zdarzenia `academy.*`
(`academy.course_published`, `academy.enrolled`, `academy.course_completed`, `academy.review_published`)
konsumują wyłącznie `notifications`, `billing` (rozliczenie sprzedaży) i `referral` (kwalifikacja
pierwszej transakcji). `ladder` subskrybuje wyłącznie `marketplace.*`/`community.*` — `academy.*` tam
nie trafia. Egzekwowane w `subscriptions.test.ts`.

## Model danych (schemat-forward — budowany w Fazie Academy, ROADMAP)

- **Course** — `authorUserId`, `title`, `description`, `price` (grosze; `0` = darmowy), `industryId?`,
  `status` (`DRAFT/PUBLISHED/ARCHIVED`), `minLevelToPublish` (snapshot polityki). FULLTEXT na `title`,
  `description` (wyszukiwarka, jak `Order`/`Post`).
- **CourseModule** / **Lesson** — struktura treści (rozdziały, lekcje: tekst/wideo/link do materiału na
  wolumenie VPS wg ADR-009).
- **Enrollment** — `courseId`, `userId`, `purchasedAt`, `progress` (0–100), `completedAt?`. Unikat
  (`courseId`,`userId`).
- **CourseReview** — ocena od **zapisanego kupującego** (`enrollmentId`), 1–5 + komentarz → zasila
  reputację autora (średnia), **nie** Drabinkę. Unikat (`enrollmentId`).
- **SkillCredential** — `userId`, `courseId`/`skillTag`, `issuedAt` — odznaka po ukończeniu (Płaszczyzna C).

Moduł `academy` z publicznym API `index.ts` (granice ADR-002), zdarzenia przez outbox; sprzedaż
delegowana do modułu `billing` (ADR-013) — `academy` nie dotyka PSP bezpośrednio.

## Konsekwencje

- (+) Silny magnes na aspirujących liderów i realne złagodzenie cold-startu (R-06): treść przyciąga,
  zanim marketplace ma płynność.
- (+) Nowe źródło przychodu (twórca + platforma) spójne z modelem prowizji malejącej z poziomem (ADR-013).
- (+) Drabinka nietknięta — nauka buduje reputację i odznaki, nie kupuje statusu.
- (−) Treść cyfrowa = obowiązki (VAT/OSS, prawo odstąpienia, jakość/reklamacje) — R-16, adres prawny
  właściciela + moderacja.
- (−) Zależność od płatności (ADR-013) dla kursów płatnych — darmowe kursy można uruchomić wcześniej,
  płatne po wejściu PSP.

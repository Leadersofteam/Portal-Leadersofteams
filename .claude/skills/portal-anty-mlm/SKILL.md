---
name: portal-anty-mlm
description: Obowiązkowy rytuał ADR-004 przy dodawaniu funkcji społecznej w Portalu LoT — rozszerzenie strukturalnej ścieżki testu, żeby nowa funkcja nie przeszła obok strażnika. Użyj ZAWSZE, gdy dodajesz wpisy, komentarze, reakcje, obserwowanie, tematy, cytowanie, zaproszenia albo cokolwiek, co użytkownik może zrobić „społecznie".
---

# Anty-MLM — strażnik działa tylko na tym, przez co przeszedł

Portal obiecuje: **status trzeba zapracować, punkt przyznaje wyłącznie drugi człowiek za
realną pracę**. To jedyny wyróżnik, którego konkurencja nie skopiuje bez przebudowy produktu.
Pilnuje tego test STRUKTURALNY, nie regulamin.

## Jak działa strażnik

`apps/api/src/modules/social/antimlm.integration.test.ts`:

1. przechodzi PEŁNĄ ścieżkę społeczną (obserwowanie → wpis → komentarz ze wzmianką →
   docenienie → cytowanie → wpis z tematem),
2. zbiera **wszystkie** zdarzenia, jakie ta ścieżka wypuściła do outboxa,
3. asertuje, że lista jest niepusta (inaczej zieleniłby się z niewłaściwego powodu),
4. sprawdza, że **żadne** z nich nie jest kluczem w `ladderSubscriptions`,
5. dowodzi po stronie danych: zero `PointEvent`, zero punktów w `LadderState`.

## Co MUSISZ zrobić, dodając funkcję społeczną

**Dopisz swój krok do ścieżki w tym teście.** Test strzeże wyłącznie tego, przez co realnie
przeszedł — funkcja spoza ścieżki nie jest sprawdzana i test zazieleni się PRZEZ POMINIĘCIE.

Zdarzyło się to już przy cytowaniu: test był zielony, choć w ogóle nie dotykał nowej funkcji.
Dlatego obok asercji „żadne zdarzenie nie jest w ladderze" stoi teraz asercja pozytywna:

```ts
expect(types).toContain('social.post_quoted');
```

Dodając funkcję, która emituje własne zdarzenie, **dołóż analogiczną asercję** — inaczej
za pół roku ktoś usunie krok ze ścieżki i nikt się nie dowie.

## Wzorzec, który jest bezpieczniejszy od testu

**Jeśli funkcja NIE ma dawać punktów, najlepiej żeby w ogóle nie emitowała zdarzenia.**
Tak działa onboarding: `identity.updateOnboarding` nie wypuszcza ANI JEDNEGO zdarzenia,
więc nie ma drogi do laddera — zabezpieczenie z architektury, nie z konfiguracji.

Gdy zdarzenie jest potrzebne (np. powiadomienie dla cytowanego autora), zadbaj, żeby
konsumował je **wyłącznie** `notifications`, i napisz to wprost w komentarzu przy subskrypcji.

## Gdzie punkty MOGĄ powstawać

Dokładnie dwa miejsca, obie zaprojektowane w ADR-004:

- `marketplace.review_published` — ocena po zrealizowanym zleceniu,
- `community.answer_accepted` / `answer_upvoted` — uznana odpowiedź w Q&A.

Naliczanie żyje **wyłącznie** w module `ladder` (jeden punkt audytu). Moduł `community`
emituje zdarzenia, ale nie zna logiki punktowej.

## Czerwony test to nie problem testu

Jeśli Twoja zmiana psuje `antimlm.integration.test.ts` albo `ladder/subscriptions.test.ts` —
**to nie testy są złe**. To znaczy, że zmiana otwiera drogę do zdobycia statusu inaczej niż
pracą. Taka zmiana wymaga rozmowy z właścicielem i rewizji ADR-004, nie obejścia w teście.

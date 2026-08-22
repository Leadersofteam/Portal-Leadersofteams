# Konta wyprawy — persony testowe na produkcji

> **To są konta testowe-persony** (decyzja właściciela 22.08: realistyczna tożsamość,
> rzetelna treść, konta ZOSTAJĄ po sesji jako zawartość Portalu). Ten plik jest jedynym
> miejscem, po którym odróżnia się je od realnych ludzi — **przy każdym liczeniu
> „realnych użytkowników" wykluczaj te adresy** (obok `@demo.leadersofteams.pl`
> i `deleted-%`). Hasła w `wyprawa/harness/harness.mjs` (konwencja audyt/harness App).

| Klucz      | Persona                                                 | E-mail                                | Rola w wyprawie                                                                             |
| ---------- | ------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `lider`    | Konrad Jaworowski — konsultant ops/B2B, bohater wyprawy | k.jaworowski@jaworowski-consulting.pl | wspina się po Drabince, pisze dziennik, potem prowadzi zespół w App                         |
| `firma1`   | Alicja Kwiatkowska — „Kwiatkowscy Wnętrza"              | biuro@kwiatkowscy-wnetrza.pl          | zleceniodawca 1 (cykle zleceń)                                                              |
| `firma2`   | Tomasz Stalmach — „Stalmet Konstrukcje"                 | kontakt@stalmet-konstrukcje.pl        | zleceniodawca 2                                                                             |
| `firma3`   | Ewa Brandys — „Brandpoint Agency"                       | hello@brandpoint.agency               | zleceniodawca 3                                                                             |
| `pytajacy` | Michał Wiśniowski — interim manager                     | m.wisniowski@interim-managers.pl      | zadaje pytania w Q&A i AKCEPTUJE odpowiedzi lidera (tylko ten kierunek — wzajemność → HOLD) |

Zasady twarde:

- **Macix (`kuchar21ski@gmail.com`) i konta demo — nietykalne.**
- Zero maili do kogokolwiek; adresy person nie mają skrzynek (weryfikacja e-mail
  niczego nie blokuje — zmierzone).
- Punkty wyłącznie realnymi ścieżkami serwisu; kompresja czasu tylko narzędziem
  `apps/api/prisma/wyprawa-czas.ts` i tylko dla tych kont.

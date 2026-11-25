# Wytyczne „Portal Liderów” — kierunek własny Portalu (od 20.11.2026)

Dla Lidera i sesji roboczych. Zastępuje wersję z 19.11 („siostra Feniks v17” — rama App przeniesiona 1:1).
Skill: `portal-v17-design`. Program i akceptacje: `docs/PROGRAM-V17-PORTAL.md`. Recenzja: `recenzent-wygladu`, zgodność: `zgodnosc-makiety`.

> Maciej 20.11: „Portal powinien mieć jednak inny design niż Aplikacja Lot ale mogą być podobne. Drabinka Lidera to coś innego niż
> aplikacja ERP/CRM chcę aby Portal Liderów gdzie można będzie wspinać się na różne Level po drabince lidera była opracowana z sensem.
> Coś jak x.com github.com, oferteo.pl i fiverr.com w jednym.”

> Zasada nadrzędna: **ekran istnieje, żeby ktoś znalazł wykonawcę, zlecenie albo odpowiedź — albo zapracował następny szczebel.**
> Prawo sieci (SIEC-LOT §4.2): **twój punkt nigdy nie świeci sam** — każde światło przychodzi od innego człowieka.

## 1. Cztery inspiracje → wzorce Portalu

Bierzemy **wzorce zachowania i układu**, nie wygląd, kolory, logo ani nazwy cudzych serwisów.

> Maciej 25.11 (po makiecie, która „wygląda trochę na AI Loop”): „Inspiruj się X.com github.com oferteo.pl itp... w naszej
> identyfikacji wizualnej.” → **Układ i gęstość od nich, skóra nasza.** Gęstość i spokój jak GitHub/X: wpis to wiersz z
> separatorem 1 px (bez ramki), promienie 4–8 px, szare obwódki, mało cieni, hierarchia z typografii, nie z koloru.
> Kolor ma znaczenie: fiolet = sieć i JEDNA akcja główna; bursztyn = wyłącznie zapracowane (+pkt, L7); poziomy `--level-*`.
> Antywzorzec „AI loop” (zmierzony 25.11): fiolet na wszystkim, pigułki, ta sama postać-awatar w innym kolorze,
> płaska typografia, stos widżetów w prawej kolumnie, dwa konkurujące przyciski główne.

| Inspiracja | Wzorzec                                                                                                                                                                            | Ekrany Portalu                                             | Granica                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| x.com      | 3 kolumny: wąska nawigacja ikon (lewa) · strumień 600 px (środek) · kontekst (prawa). Wpis = wiersz z awatarem, nie karta. Kompozytor na górze strumienia.                         | `/feed` (dom zalogowanego), `/pytania`, `/watki`, `/wpisy` | ADR-010: chronologicznie, „Pokaż więcej”, zero liczników wyświetleń, zero DM, zero „trendów” w kolejności treści |
| github.com | Profil jak repozytorium: nagłówek (awatar, poziom, branża, miasto) + zakładki **Przegląd · Realizacje · Odpowiedzi · Oceny**; przypięte realizacje (2×3); oś „kto dał ci światło”. | `/profil/[handle]`, `/liderzy/[id]`                        | **Bez heatmapy dni** — to mechanika serii (ADR-010)                                                              |
| fiverr.com | Karta usługi: miniatura, tytuł, Lider + odznaka poziomu, ocena (liczba ocen), cena „od”. **Poziom z jawną listą wymagań** do następnego.                                           | `/uslugi`, `/uslugi/[id]`, odznaka poziomu wszędzie        | Poziom wyłącznie z punktów Drabinki (ADR-004)                                                                    |
| oferteo.pl | „Opisz, czego potrzebujesz → dostaniesz oferty”: kreator zlecenia w 3 krokach, licznik ofert na zleceniu, porównanie ofert obok siebie.                                            | `/zlecenia`, `/dla-firm`, `/porownanie`, `/zapytania`      | click = 0 zł: żadnych płatnych leadów ani opłat za ofertę                                                        |

## 2. Drabinka z sensem (reguły z `apps/api/src/modules/ladder/rules.ts`, nie z pamięci)

- 7 szczebli: **Adept 100 · Praktyk 300 · Specjalista 700 · Ekspert 1500 · Mentor 3000 · Autorytet 6000 · Architekt Zespołów 12 000 pkt.**
- Dwie ścieżki: **rynek** (ocena 5/5 po zleceniu = 100 pkt, malejące zwroty od tego samego kontrahenta) i **społeczność**
  (uznana odpowiedź 50 pkt, kwalifikowany głos 10 pkt, limit 300 pkt / 7 dni).
- **Od L4 min. 20% progu z każdej ścieżki** — pokazujemy dwa paski, nie jeden.
- **Karencja 7 dni**: punkty „dojrzewają” (stan pending) — pokazujemy „dojrzewa za N dni”, nie ukrywamy.
- **Co odblokowuje szczebel:** L5 → dostęp do LOT App, L7 → własny zespół. Pozostałe szczeble: tylko to, co kod naprawdę daje
  (nie dopisujemy nagród, których nie ma).
- Każde światło ma **źródło-człowieka**: awatar firmy/osoby, która oceniła albo uznała odpowiedź. Rekrutacja, logowania, aktywność → zero
  (pokazujemy to jako „czego Drabinka nie liczy”, nie chowamy).
- Gdzie: pełna drabina na `/drabinka` (z obecną sceną 3D w nagłówku), skrót w prawej kolumnie strumienia, pasek na profilu, odznaka na karcie.

## 3. Tożsamość wizualna — podobna do App, ale nie ta sama

|           | Portal Liderów                                                                                      | LOT App (dla porównania — NIE kopiujemy) |
| --------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Układ     | sieć + rynek: 3 kolumny / katalog / profil                                                          | panel ERP: szyna↔panel, rzędy KPI        |
| Nawigacja | lewa kolumna ikon z podpisem (desktop), dolny pasek 5 slotów (telefon, `bottom-nav.tsx`)            | szyna 76 ↔ panel 256                     |
| Tło       | czyste (`--bg`/`--surface`), światło poziomów jako jedyny „efekt”; scena 3D tylko `/` i `/drabinka` | siatka liderów (canvas)                  |
| Karty     | lekkie: obwódka 1 px `--border`, promień `--radius`, bez gradientowych ramek i reflektora           | obramowanie gradientowe                  |
| Gęstość   | wiersze jak X/GitHub (awatar 40 px, 2 linie, separatory)                                            | kafle i wykresy                          |

**Wspólne z siecią:** fiolet = sieć (`--primary-*`, `--violet-500`), **ciepły akcent = zapracowane** (`--level-7`/bursztyn tylko przy L7 i
zapracowanym momencie), Bricolage (nagłówki, liczby) + Inter (tekst), **Phosphor duotone** (decyzja 19.11 „Phosphor jak w App”),
stopka „Ekosystem” (`apps/web/lib/ecosystem.ts`, treść nietykalna). Instrument Serif — opcjonalnie jedno słowo na stronach publicznych.

**Odznaka poziomu** (komponent wspólny dla całego Portalu): numer w kółku w kolorze `--level-n` + nazwa szczebla; temperatura zawsze z etykietą.

## 4. UX — reguły

1. Jedno główne wezwanie do działania na ekran (strumień: kompozytor; katalog: „Dodaj zlecenie” / „Zaproponuj usługę”; profil: „Zaproponuj zlecenie”).
2. Stan pusty mówi, co zrobić, i nigdy nie udaje danych („Nowy w Portalu”, nie 5 pustych gwiazdek).
3. Komplet stanów: pusty, ładowanie (szkielety w kształcie wierszy), błąd z „Spróbuj ponownie”.
4. Listy kończą się „Pokaż więcej” z liczbą („20 z 87”) — nigdy nieskończone przewijanie.
5. Telefon 390 pierwszy. Maciej: „Na telefonie wszystko musi się mieścić w ekranie ewentualnie zgadzam się na przesuwanie kafelków i
   komponentów w poziomie.” — w poziomie tylko `data-przesuw` (zakładki profilu, filtry-pigułki, przypięte realizacje).
6. Dostępność: kontrast AA, fokus widoczny, ARIA na ikonach bez tekstu, cele ≥ 44 px.

## 5. Antywzorce

- Rama i pulpit z LOT App (szyna↔panel, rzędy KPI, siatka liderów, gradientowe ramki) — Portal to nie ERP.
- Heatmapa aktywności, serie, liczniki wyświetleń/obserwujących jako wynik, ranking treści, DM, infinite scroll (ADR-010).
- Punkty/odznaki za zaproszenia, logowanie, wpisy, obserwowanie (ADR-004); drzewo poleceń, piramida.
- Kopiowanie wyglądu cudzych serwisów (ich kolory, logo, ikony, układ 1:1) — bierzemy wzorce, nie skórę.
- Liczby, których Portal nie liczy; zdania-opisy nad sekcjami.
- Google Fonts / CDN w kodzie aplikacji (ADR-009) — w makietach HTML wolno.
- Zmiana etykiet stopki „Ekosystem”.

## 6. Bramka „ekran gotowy” (Definition of Done)

1. Makieta zaakceptowana przez Macieja (cytat + data w `PROGRAM-V17-PORTAL.md`).
2. Kod pod flagą `html[data-wyglad="v17"]`, wspólne komponenty (odznaka poziomu, wiersz strumienia, karta usługi, karta zlecenia).
3. Zrzuty 1512 + 390 × jasny + ciemny → `zgodnosc-makiety` ZGODNY w 4 parach. Maciej: „Kod nie może się różnić od makiety którą
   akceptuję to jest zasada.” / „Kod musi być zgodny z Makietami a nawet je dopracowywać jeśli zauważy błędy.” Poprawka makiety z kodu →
   wiersz „Poprawki z kodu” w `docs/redesign-propozycje/v17/README.md` + zrzut do Macieja.
4. `recenzent-wygladu` bez P1; scrollWidth = szerokość; cele ≥ 44 px; reduced-motion.
5. Ścieżka przejdziona na żywo; konta testowe posprzątane.
6. `portal-bramki` zielone (w tym `antimlm.integration.test.ts` rozszerzony przy funkcji społecznej).

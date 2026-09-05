// Treść hubów branżowych (PL4). Programmatic SEO bez generatora: dziesięć
// branż × trzy wejścia (usługi / zlecenia / Liderzy) = trzydzieści akapitów
// napisanych ręcznie, każdy mówi coś INNEGO o tej branży w tym kontekście.
// Zasada z planu: „każda strona wnosi odrębną wartość, nie podmianę zmiennej".
// Slugi = `industries.slug` z bazy (seed); brak wpisu → hub używa tekstu
// ogólnego, nie pada.
export interface IndustryCopy {
  /** Dla /uslugi/branza/[slug] — co Firma zwykle tu kupuje. */
  uslugi: string;
  /** Dla /zlecenia/branza/[slug] — jak wygląda dobre zlecenie w tej branży. */
  zlecenia: string;
  /** Dla /liderzy/branza/[slug] — po czym poznać Lidera tej branży. */
  liderzy: string;
}

export const INDUSTRY_COPY: Record<string, IndustryCopy> = {
  'ai-automatyzacja': {
    uslugi:
      'Automatyzacje procesów, agenci AI, integracje między narzędziami. Tu kupujesz zakres, nie obietnicę: usługa ma pakiet, cenę i Lidera z poziomem zdobytym wdrożeniami, które ktoś ocenił.',
    zlecenia:
      'Najlepsze zlecenia z AI i automatyzacji opisują proces „jak jest" i „jak ma być", nie narzędzie. Widełki i dane wejściowe na start oszczędzają obu stronom tygodnia rozmów.',
    liderzy:
      'Lider automatyzacji pokazuje zrealizowane wdrożenia, nie certyfikaty. Poziom w Drabince rośnie tylko od ocen Firm i uznanych odpowiedzi — sprawdź go zamiast portfolio z logotypów.',
  },
  'design-ux': {
    uslugi:
      'Audyty UX, projekty interfejsów, systemy designu. Usługa z jawnym pakietem mówi, co dostaniesz na końcu — makiety, prototyp, badanie — zanim napiszesz pierwszą wiadomość.',
    zlecenia:
      'Zlecenie z designu działa, gdy ma cel biznesowy (co ma się poprawić), a nie listę ekranów. Liderzy odpowiadają ofertą i mogą dopytać w rozmowie przy ofercie.',
    liderzy:
      'Poziom Lidera UX to suma ocen po realizacjach i uznanych odpowiedzi w grupach — nie liczba obserwujących. Profil pokazuje datę każdego awansu.',
  },
  'e-commerce': {
    uslugi:
      'Sklepy, integracje płatności i logistyki, optymalizacja konwersji. Pakiet z ceną i zakresem zamiast „wycena po rozmowie" — porównasz trzy usługi w pięć minut.',
    zlecenia:
      'Dobre zlecenie e-commerce podaje platformę, skalę (zamówienia miesięcznie) i to, co dziś boli. Oferty składają Liderzy o wymaganym poziomie, resztę odsiewa Drabinka.',
    liderzy:
      'Lider e-commerce z poziomem 3+ ma za sobą kilka wdrożeń ocenionych przez różne Firmy — malejące zwroty nie pozwalają dojść tam jedną zaprzyjaźnioną marką.',
  },
  finanse: {
    uslugi:
      'Księgowość, controlling, modele finansowe, przygotowanie do inwestora. Usługi z jawnym zakresem i Liderem, którego wiarygodność zbudowały oceny, nie reklama.',
    zlecenia:
      'W finansach zlecenie opisz przez ryzyko i termin: co się stanie, gdy nie będzie zrobione, do kiedy. Rozmowa przy ofercie służy do dopytania o dane, zanim ktoś obieca cenę.',
    liderzy:
      'Lider finansów pokazuje realizacje potwierdzone przez Firmy po odbiorze. Poziom nie wygasa i nie da się go kupić — to jedyny status, który znaczy to samo za rok.',
  },
  hr: {
    uslugi:
      'Rekrutacje, procesy onboardingowe, systemy ocen, employer branding. Usługa z pakietem mówi, ile kandydatów, w jakim czasie i co po drodze — bez fałszywych gwarancji.',
    zlecenia:
      'Zlecenie HR jest dobre, gdy podaje rolę, budżet i termin startu. Liderzy odpowiadają ofertą; oceny po realizacji budują reputację obu stron.',
    liderzy:
      'Lider HR z uznanymi odpowiedziami w grupie HR to ktoś, komu inni Liderzy realnie zawdzięczają rozwiązanie — mentoring liczy się w Drabince tak samo jak praca.',
  },
  it: {
    uslugi:
      'Wdrożenia, integracje, utrzymanie, audyty bezpieczeństwa. Pakiety z ceną i zakresem; poziom Lidera zdobyty realizacjami ocenionymi przez Firmy, nie listą technologii.',
    zlecenia:
      'Zlecenie IT opisuje stan obecny, oczekiwany efekt i ograniczenia (stack, terminy, dostęp). Próg „od poziomu" pozwala otworzyć je tylko dla sprawdzonych Liderów.',
    liderzy:
      'Poziom w Drabince to zapracowany dowód: każdy punkt ma źródło w ocenie po odbiorze albo w uznanej odpowiedzi. Zobacz oś awansów na profilu, nie tylko odznakę.',
  },
  marketing: {
    uslugi:
      'Strategie, kampanie, treści, SEO, automatyzacja marketingu. Pakiety z jawną ceną, a przy każdej usłudze pas zaufania: oceny i zrealizowane zlecenia — tylko fakty zapracowane.',
    zlecenia:
      'Zlecenie marketingowe ma sens, gdy podaje cel (leady, sprzedaż, rozpoznawalność), kanał i budżet. Liderzy odpowiadają ofertą i dopytują w rozmowie przy ofercie.',
    liderzy:
      'Lider marketingu awansuje wyłącznie ocenami Firm i uznaniem innych Liderów. Zero punktów za zasięgi, obserwujących czy zapraszanie — to nie jest ranking popularności.',
  },
  'produkcja-logistyka': {
    uslugi:
      'Optymalizacja procesów, lean, planowanie, łańcuch dostaw. Usługa z zakresem i ceną zamiast ogólnej „konsultacji" — i Lider, którego oceniły firmy produkcyjne.',
    zlecenia:
      'W produkcji i logistyce zlecenie opisz przez liczby: wolumen, wąskie gardło, koszt dziś. Widełki budżetu i próg poziomu Lidera ustawiasz sam.',
    liderzy:
      'Lider produkcji z poziomem 4+ musi mieć oba źródła punktów: realizacje i mentoring. To wymóg konstrukcyjny Drabinki, nie deklaracja.',
  },
  sprzedaz: {
    uslugi:
      'Procesy sprzedaży, CRM, szkolenia handlowców, prospecting. Pakiety z jawną ceną; wiarygodność Lidera z ocen po realizacjach, nie z autoprezentacji.',
    zlecenia:
      'Zlecenie sprzedażowe działa, gdy mówi o rynku, cyklu sprzedaży i celu liczbowym. Oferty przychodzą od Liderów o wymaganym poziomie, dopytujesz ich w wątku przy ofercie.',
    liderzy:
      'Lider sprzedaży zdobywa poziom pracą ocenioną przez Firmy i odpowiedziami uznanymi w grupie Sprzedaż. Profil pokazuje, kiedy wszedł na który szczebel.',
  },
  'zarzadzanie-projektami': {
    uslugi:
      'Prowadzenie projektów, PMO, wdrażanie metodyk, interim management. Usługa z pakietem i ceną; poziom Lidera to zapracowany dowód, nie tytuł na wizytówce.',
    zlecenia:
      'Zlecenie na zarządzanie projektem opisz przez zakres, zespół i termin — a budżet podaj widełkami. Lider odpowiada ofertą, Ty dopytujesz i wybierasz.',
    liderzy:
      'Lider projektów na wysokim poziomie ma za sobą realizacje od wielu różnych Firm — malejące zwroty w Drabince nie pozwalają zbudować statusu jedną współpracą.',
  },
};

export const GENERIC_COPY: IndustryCopy = {
  uslugi:
    'Usługi Liderów w tej branży z jawnym zakresem i ceną. Poziom każdego Lidera jest zapracowany — z ocen Firm po realizacjach i uznanych odpowiedzi w grupach.',
  zlecenia:
    'Otwarte zlecenia w tej branży. Liderzy o wymaganym poziomie odpowiadają ofertą, a przy każdej ofercie jest rozmowa — dopytasz, zanim wybierzesz.',
  liderzy:
    'Liderzy tej branży z poziomem w Drabince, ocenami i liczbą zrealizowanych zleceń. Status trzeba zapracować — nie da się go kupić ani wyrekrutować.',
};

export function industryCopy(slug: string): IndustryCopy {
  return INDUSTRY_COPY[slug] ?? GENERIC_COPY;
}

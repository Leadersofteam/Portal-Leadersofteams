// Strony porównawcze (PL4). Zasada: uczciwe „kiedy oni, kiedy my" — bez FUD
// (ADR-010), bez cen konkurencji (zmieniają się, a błąd kosztuje wiarygodność)
// i bez udawania, że Portal jest lepszy we wszystkim. Piszemy o MODELU, który
// jest publicznie znany, i o tym, czego u nas nie ma. Fakty o Portalu — z kodu.
export interface Porownanie {
  slug: string;
  name: string;
  /** Jednozdaniowy, neutralny opis modelu konkurenta. */
  model: string;
  /** Kiedy tamten serwis jest lepszym wyborem — na serio. */
  kiedyOni: string[];
  /** Kiedy Portal — z odwołaniem do mechaniki, nie do przymiotników. */
  kiedyMy: string[];
  faq: Array<{ q: string; a: string }>;
}

export const POROWNANIA: Porownanie[] = [
  {
    slug: 'oferteo',
    name: 'Oferteo',
    model:
      'Serwis zleceń dla wykonawców i firm: zleceniodawca opisuje potrzebę, wykonawcy odpowiadają, a serwis zarabia na dostępie wykonawców do kontaktów.',
    kiedyOni: [
      'Szukasz wykonawcy do usługi lokalnej i fizycznej (remont, przewóz, naprawa) — tam jest gęsta baza takich firm.',
      'Chcesz dużo ofert szybko i sam odsiać po cenie.',
      'Nie potrzebujesz historii współpracy ani statusu wykonawcy — liczy się jeden kontakt.',
    ],
    kiedyMy: [
      'Zlecasz pracę koncepcyjną lub zarządczą B2B (marketing, IT, HR, finanse, projekty) i chcesz wiedzieć, KTO wygrywał podobne zlecenia i jak został oceniony.',
      'Zależy Ci na statusie wykonawcy, którego nie da się kupić: poziom w Drabince rośnie tylko z ocen po realizacjach i uznanego mentoringu.',
      'Chcesz dopytać przed wyborem — przy każdej ofercie jest rozmowa, a po realizacji obie strony oceniają się symultanicznie.',
    ],
    faq: [
      {
        q: 'Czy w Leaders of Teams płacę za oferty albo kontakty?',
        a: 'Nie. Rejestracja, publikacja zlecenia, oferty i rozmowa są bezpłatne. Portal nie sprzedaje kontaktów ani widoczności — poziom Lidera zależy wyłącznie od ocen i uznania innych ludzi.',
      },
      {
        q: 'Czym różni się poziom Lidera od opinii w serwisach zleceń?',
        a: 'Opinia to ocena jednego zlecenia. Poziom w Drabince to suma ocen i uznanego mentoringu z malejącymi zwrotami od tego samego kontrahenta — jedna zaprzyjaźniona firma nie wypchnie nikogo wysoko. Zero punktów za zapraszanie czy aktywność.',
      },
      {
        q: 'Czy muszę mieć konto, żeby opisać potrzebę?',
        a: 'Nie na start. Opisujesz potrzebę bez konta, potem jednym formularzem zakładasz konto i firmę, a publikujesz po potwierdzeniu adresu e-mail.',
      },
    ],
  },
  {
    slug: 'fixly',
    name: 'Fixly',
    model:
      'Serwis usług (z grupy OLX) łączący klientów z wykonawcami usług, głównie domowych i lokalnych; wykonawcy odpowiadają na zlecenia klientów.',
    kiedyOni: [
      'Potrzebujesz kogoś „na miejscu": sprzątanie, montaż, hydraulika, korepetycje.',
      'Zależy Ci na szybkości i prostocie, a nie na długiej współpracy.',
      'Wykonawca ma być osobą fizyczną z sąsiedztwa, nie zespołem czy liderem projektu.',
    ],
    kiedyMy: [
      'Potrzebujesz Lidera do pracy B2B, którą trzeba poprowadzić: wdrożenie, kampania, proces, projekt.',
      'Chcesz, żeby reputacja wykonawcy była policzalna i jawna — każdy punkt ma źródło, a oś awansów jest na profilu.',
      'Interesuje Cię wykonawca, który także uczy innych: od poziomu 4 Drabinka wymaga i pracy, i mentoringu.',
    ],
    faq: [
      {
        q: 'Czy Leaders of Teams to marketplace usług domowych?',
        a: 'Nie. To marketplace B2B i społeczność Liderów: zlecenia i usługi z zakresu marketingu, IT, HR, finansów, sprzedaży, zarządzania projektami i podobnych. Do usług domowych lepsze są serwisy lokalne.',
      },
      {
        q: 'Jak sprawdzić wykonawcę przed wyborem?',
        a: 'Na profilu Lidera widzisz poziom w Drabince z datami awansów, oceny Firm po realizacjach i liczbę zrealizowanych zleceń. Przy ofercie możesz dopytać w rozmowie zanim wybierzesz.',
      },
    ],
  },
  {
    slug: 'useme',
    name: 'Useme',
    model:
      'Platforma do rozliczania pracy freelancerów z firmami: pośredniczy w umowie i płatności, pobierając prowizję od rozliczanych zleceń.',
    kiedyOni: [
      'Masz już wykonawcę i potrzebujesz przede wszystkim bezpiecznego rozliczenia i dokumentów.',
      'Chcesz, żeby płatność szła przez pośrednika (depozyt) — Portal dziś nie prowadzi płatności.',
      'Rozliczasz wielu freelancerów i liczy się administracja, nie dobór.',
    ],
    kiedyMy: [
      'Dopiero SZUKASZ właściwej osoby i chcesz porównać Liderów po zapracowanym statusie, a nie po autoprezentacji.',
      'Zależy Ci na pełnym cyklu: oferta → rozmowa → realizacja → obustronna ocena, która buduje reputację obu stron.',
      'Chcesz budować długą współpracę z Liderem, którego wzrost w Drabince widzisz na osi czasu.',
    ],
    faq: [
      {
        q: 'Czy Leaders of Teams prowadzi płatności albo umowy?',
        a: 'Nie. Portal to lead-gen z formalnym cyklem życia zlecenia (od publikacji do obustronnej oceny). Płatność i umowa są między Firmą a Liderem; płatności w Portalu to świadomie odłożona decyzja.',
      },
      {
        q: 'Skąd wiem, że oceny są prawdziwe?',
        a: 'Ocenić można tylko zlecenie potwierdzone przez obie strony, oceny publikują się symultanicznie (bez odwetu), a punkty dojrzewają 7 dni z kontrolą antyfraudową. Zapraszanie, logowanie i aktywność nie dają punktów.',
      },
    ],
  },
];

export function porownanie(slug: string): Porownanie | undefined {
  return POROWNANIA.find((p) => p.slug === slug);
}

// Droga Firmy od opisu potrzeby do ocenionej pracy — jedno źródło dla strony
// głównej i /dla-firm (fala 2, 21.10). Dwie kopie tych samych kroków rozjechały
// się już raz (landing mówił o Liderze, /dla-firm o Firmie); teraz zmiana
// procesu = zmiana w jednym miejscu.
export const FIRM_STEPS = [
  {
    title: 'Opisz potrzebę',
    body: 'Tytuł, branża, widełki budżetu i kilka zdań o tym, co ma powstać. Konto założysz w następnym kroku — jednym formularzem, razem z nazwą firmy.',
  },
  {
    title: 'Dostań oferty',
    body: 'Liderzy odpowiadają ofertą z kwotą i terminem. Przy każdej widzisz poziom w Drabince, oceny od innych Firm i liczbę zrealizowanych zleceń — żadnego z tych sygnałów nie da się kupić.',
  },
  {
    title: 'Dopytaj i wybierz',
    body: 'Każda oferta ma rozmowę: dopytasz o zakres, termin albo cenę, zanim wybierzesz. O nowej ofercie i odpowiedzi dostaniesz e-mail.',
  },
  {
    title: 'Odbierz pracę i oceń',
    body: 'Lider oddaje pracę, Ty potwierdzasz wykonanie. Oceniacie się nawzajem — obie oceny publikują się naraz, więc żadna strona nie ocenia „pod dyktando”.',
  },
] as const;

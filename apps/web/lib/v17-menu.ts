// JEDNO źródło pozycji menu V17 (szyna, panel i arkusz „Więcej" czytają stąd).
// Sekcje wg skilla portal-v17-design i MENU_LIDER z makiety. Nazwy ikon to
// Phosphor — mapuje je komponent kliencki (v17-icons.tsx), by ten plik został
// czystymi danymi (bez importu Reacta, testowalny).
export interface V17Item {
  href: string;
  label: string;
  icon: string;
  /** pozycja liczy powiadomienia — komponent doda plakietkę */
  badge?: boolean;
}
export interface V17Section {
  title: string;
  items: V17Item[];
}

export const V17_MENU: V17Section[] = [
  {
    title: 'Rynek',
    items: [
      { href: '/zlecenia', label: 'Zlecenia', icon: 'Briefcase' },
      { href: '/uslugi', label: 'Usługi', icon: 'Storefront' },
      { href: '/firmy', label: 'Firmy', icon: 'Buildings' },
    ],
  },
  {
    title: 'Liderzy',
    items: [
      { href: '/liderzy', label: 'Liderzy', icon: 'UsersThree' },
      { href: '/drabinka', label: 'Drabinka', icon: 'Ladder' },
      { href: '/droga', label: 'Droga Lidera', icon: 'Path' },
    ],
  },
  {
    title: 'Społeczność',
    items: [
      { href: '/feed', label: 'Feed', icon: 'Rss' },
      { href: '/pytania', label: 'Pytania', icon: 'Question' },
      { href: '/grupy', label: 'Grupy', icon: 'UsersFour' },
      { href: '/tematy', label: 'Tematy', icon: 'Hash' },
    ],
  },
  {
    title: 'Moje',
    items: [
      { href: '/panel', label: 'Panel', icon: 'SquaresFour' },
      { href: '/panel/oferty', label: 'Oferty', icon: 'Tag' },
      { href: '/panel/zapisane', label: 'Zapisane', icon: 'BookmarkSimple' },
      { href: '/powiadomienia', label: 'Powiadomienia', icon: 'Bell', badge: true },
      { href: '/panel/konto', label: 'Konto', icon: 'UserCircle' },
    ],
  },
];

// Dolny pasek telefonu: pozycje o tym samym sensie co istniejący bottom-nav
// (Feed, Usługi, [+], Powiadomienia) + „Więcej" otwierające arkusz sekcji.
export const V17_BOTTOM: V17Item[] = [
  { href: '/feed', label: 'Feed', icon: 'Rss' },
  { href: '/uslugi', label: 'Usługi', icon: 'Storefront' },
  { href: '/zlecenia/nowe', label: 'Dodaj', icon: 'PlusCircle' },
  { href: '/powiadomienia', label: 'Powiadomienia', icon: 'Bell', badge: true },
];

export function v17Active(pathname: string, href: string): boolean {
  if (href === '/panel') return pathname === '/panel';
  return pathname === href || pathname.startsWith(`${href}/`);
}

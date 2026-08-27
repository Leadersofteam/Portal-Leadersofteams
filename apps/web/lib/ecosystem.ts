// Cztery właściwości webowe marki Leaders of Teams — jedna lista, ta sama
// w każdym z czterech repozytoriów (Portal, App, leadersofteam.pl,
// leadersofteams.com).
//
// Powód istnienia: do 2026-08-27 jedyny link międzydomenowy prowadził
// z `leadersofteams.com` na `leadersofteam.pl`. Kto trafiał na dowolną inną
// właściwość, nie miał jak się dowiedzieć, że pozostałe istnieją.
//
// ETYKIETY SĄ DOSŁOWNIE TE SAME na wszystkich czterech stronach — to nie jest
// kosmetyka, tylko cały sens tej listy: człowiek, który raz zobaczył
// „Sieć Liderów", ma rozpoznać ten sam punkt na każdej kolejnej domenie.
// Zmiana etykiety wymaga zmiany w CZTERECH repozytoriach naraz, inaczej
// rozpoznawalność znika.
//
// Kolejność też jest wspólna: produkt → sieć → firma → wersja EN.

export type EcosystemLink = {
  /** Etykieta — identyczna we wszystkich czterech repozytoriach. */
  readonly label: string;
  readonly href: string;
  /** Jedno zdanie: co człowiek tam znajdzie. */
  readonly description: string;
  /** Język treści pod adresem — dla `hreflang`/`lang` na stronie EN. */
  readonly lang: 'pl' | 'en';
  /** Host, po którym właściwość poznaje samą siebie i pomija swój wpis. */
  readonly self: string;
};

export const ECOSYSTEM: readonly EcosystemLink[] = [
  {
    label: 'LOT App',
    href: 'https://app.leadersofteams.com',
    description: 'CRM zespołu sprzedaży — leady, projekty, prowizje.',
    lang: 'pl',
    self: 'app.leadersofteams.com',
  },
  {
    label: 'Sieć Liderów',
    href: 'https://leadersofteams.pl',
    description: 'Zlecenia, katalog Liderów, grupy branżowe i Drabinka.',
    lang: 'pl',
    self: 'leadersofteams.pl',
  },
  {
    label: 'O firmie',
    href: 'https://leadersofteam.pl',
    description: 'Manifest, realizacje, usługi agencyjne i cennik.',
    lang: 'pl',
    self: 'leadersofteam.pl',
  },
  {
    label: 'International / EN',
    href: 'https://leadersofteams.com',
    description: 'Product site in English.',
    lang: 'en',
    self: 'leadersofteams.com',
  },
] as const;

/** Ta właściwość. Własnego wpisu się nie linkuje. */
export const THIS_PROPERTY = 'leadersofteams.pl';

export const ECOSYSTEM_OTHERS = ECOSYSTEM.filter((link) => link.self !== THIS_PROPERTY);

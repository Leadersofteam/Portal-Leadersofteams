// Cztery właściwości webowe marki Leaders of Teams — jedna lista, BAJT W BAJT
// ta sama w czterech repozytoriach:
//
//   Leaders-of-Teams-APP         apps/web/config/ecosystem.ts
//   Portal-Leadersofteams        apps/web/lib/ecosystem.ts
//   Leadersofteam (.pl)          src/data/ecosystem.ts
//   Leaders-of-Teams-Nowa-Strona src/config/ecosystem.ts
//
// To, czym repozytoria się różnią (która właściwość jest „tu”), żyje obok
// w `ecosystem.self.ts`. Kontrola z katalogu nad czterema klonami:
//   md5sum */apps/web/config/ecosystem.ts */apps/web/lib/ecosystem.ts \
//          */src/data/ecosystem.ts */src/config/ecosystem.ts
//
// Powód istnienia: do 2026-08-27 jedyny link międzydomenowy prowadził
// z `leadersofteams.com` na `leadersofteam.pl`. Kto trafiał na dowolną inną
// właściwość, nie miał jak się dowiedzieć, że pozostałe istnieją.
//
// ETYKIETY SĄ DOSŁOWNIE TE SAME na wszystkich czterech stronach i nie
// przechodzą przez słowniki — człowiek, który raz zobaczył „Sieć Liderów”,
// ma rozpoznać ten sam punkt na każdej kolejnej domenie, także w wersji EN.
// Zestaw nazw potwierdził właściciel 2026-11-24 (do tego dnia `.com` mówił
// „Agencja” i „International”). Zmiana etykiety = cztery PR-y naraz.
//
// Kolejność też jest wspólna: produkt → sieć → firma → wersja EN.
// `id` jest kluczem dla treści tłumaczonej (opisy w słownikach danego repo).

import { THIS_PROPERTY } from './ecosystem.self';

export type EcosystemId = 'app' | 'portal' | 'site' | 'en';

export type EcosystemLink = {
  /** Stały klucz — dla słowników i `key` w listach. */
  readonly id: EcosystemId;
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
    id: 'app',
    label: 'LOT App',
    href: 'https://app.leadersofteams.com',
    description: 'CRM zespołu sprzedaży — leady, projekty, prowizje.',
    lang: 'pl',
    self: 'app.leadersofteams.com',
  },
  {
    id: 'portal',
    label: 'Sieć Liderów',
    href: 'https://leadersofteams.pl',
    description: 'Zlecenia, katalog Liderów, grupy branżowe i Drabinka.',
    lang: 'pl',
    self: 'leadersofteams.pl',
  },
  {
    id: 'site',
    label: 'O firmie',
    href: 'https://leadersofteam.pl',
    description: 'Manifest, realizacje, usługi agencyjne i cennik.',
    lang: 'pl',
    self: 'leadersofteam.pl',
  },
  {
    id: 'en',
    label: 'International / EN',
    href: 'https://leadersofteams.com',
    description: 'Product site in English.',
    lang: 'en',
    self: 'leadersofteams.com',
  },
] as const;

/** Wpis po identyfikatorze — adres z jednego źródła zamiast przepisanego z ręki. */
export const ecosystemLink = (id: EcosystemId): EcosystemLink =>
  ECOSYSTEM.find((link) => link.id === id) as EcosystemLink;

/** Trzy pozostałe właściwości. Własnego wpisu się nie linkuje. */
export const ECOSYSTEM_OTHERS: readonly EcosystemLink[] = ECOSYSTEM.filter(
  (link) => link.self !== THIS_PROPERTY,
);

// Nazwy poziomów — lustro apps/api/src/modules/ladder/rules.ts (ruleset v1).
// Wyniesione z app/page.tsx, bo pierwsza mila (feed, landing) pokazuje nazwę
// obok numeru: „Poziom 3" mówi mniej niż „Poziom 3 · Specjalista".
export const LEVEL_NAMES = [
  'Adept',
  'Praktyk',
  'Specjalista',
  'Ekspert',
  'Mentor',
  'Autorytet',
  'Architekt Zespołów',
] as const;

export function levelName(level: number): string | undefined {
  return LEVEL_NAMES[level - 1];
}

// Progi i odblokowania — lustro `LEVELS` z apps/api/src/modules/ladder/rules.ts
// (ruleset v1). Źródłem prawdy w runtime jest API (`/ladder/levels`); to jest
// ZAPAS na moment, gdy API nie odpowiada — przede wszystkim przy `next build`,
// który prerenderuje statyczne strony BEZ działającego API (ECONNREFUSED) i bez
// zapasu zamrażał w HTML „nie udało się wczytać progów" na pierwsze 5 minut
// po każdym wdrożeniu (ISR). Zmiana rulesetu = zmiana tu i w rules.ts.
export interface LevelRule {
  level: number;
  name: string;
  pointsRequired: number;
  minPathSharePct: number;
  unlocksAppAccess: boolean;
  unlocksTeamCreation: boolean;
}

export const LEVEL_RULES_FALLBACK: LevelRule[] = [
  {
    level: 1,
    name: 'Adept',
    pointsRequired: 100,
    minPathSharePct: 0,
    unlocksAppAccess: false,
    unlocksTeamCreation: false,
  },
  {
    level: 2,
    name: 'Praktyk',
    pointsRequired: 300,
    minPathSharePct: 0,
    unlocksAppAccess: false,
    unlocksTeamCreation: false,
  },
  {
    level: 3,
    name: 'Specjalista',
    pointsRequired: 700,
    minPathSharePct: 0,
    unlocksAppAccess: false,
    unlocksTeamCreation: false,
  },
  {
    level: 4,
    name: 'Ekspert',
    pointsRequired: 1500,
    minPathSharePct: 20,
    unlocksAppAccess: false,
    unlocksTeamCreation: false,
  },
  {
    level: 5,
    name: 'Mentor',
    pointsRequired: 3000,
    minPathSharePct: 20,
    unlocksAppAccess: true,
    unlocksTeamCreation: false,
  },
  {
    level: 6,
    name: 'Autorytet',
    pointsRequired: 6000,
    minPathSharePct: 20,
    unlocksAppAccess: true,
    unlocksTeamCreation: false,
  },
  {
    level: 7,
    name: 'Architekt Zespołów',
    pointsRequired: 12000,
    minPathSharePct: 20,
    unlocksAppAccess: true,
    unlocksTeamCreation: true,
  },
];

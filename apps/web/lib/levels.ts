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

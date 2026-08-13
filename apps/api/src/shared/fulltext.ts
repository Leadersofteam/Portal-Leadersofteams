// Wspólna warstwa zapytań pełnotekstowych (MySQL InnoDB FULLTEXT).
//
// Dlaczego BOOLEAN MODE, a nie NATURAL LANGUAGE: tylko tryb boolowski pozwala
// na prefiksy (`lider*` znajduje „liderów", `rekrut*` znajduje „rekrutację").
// Bez tego katalog wygląda na pusty przy najbardziej naturalnych zapytaniach.
// Reguła 50% (słowo w ponad połowie wierszy jest ignorowane) dotyczy MyISAM,
// nie InnoDB — więc recall na tym nie traci.
//
// ⚠️ innodb_ft_min_token_size = 3 (domyślnie): „HR", „IT", „AI" NIGDY nie trafią
// do indeksu. Dlatego każdy wołający MUSI mieć fallback (LIKE albo tagi) —
// zwracamy wtedy null, żeby ten przypadek był jawny, a nie cichy.

export const FULLTEXT_MIN_TOKEN = 3;
const MAX_TOKENS = 10;

// Znaki sterujące trybu boolowskiego. Wycinamy je, żeby użytkownik nie mógł
// (przypadkiem lub celowo) zbudować własnego wyrażenia — to druga linia obrony;
// pierwszą jest przekazanie wyniku jako PARAMETRU zapytania, nigdy przez sklejanie.
const OPERATORS = /[+\-><()~*"@]/g;

/**
 * Zamienia frazę użytkownika na wyrażenie BOOLEAN MODE z prefiksami.
 * Zwraca `null`, gdy nie zostaje żaden użyteczny token — wtedy wołający
 * powinien sięgnąć po fallback (LIKE), zamiast odpytywać indeks o nic.
 */
export function toBooleanQuery(raw: string, minToken = FULLTEXT_MIN_TOKEN): string | null {
  const tokens = raw
    .replace(OPERATORS, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= minToken)
    .slice(0, MAX_TOKENS);

  if (tokens.length === 0) return null;
  return tokens.map((t) => `+${t}*`).join(' ');
}

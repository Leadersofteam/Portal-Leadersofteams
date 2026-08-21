/**
 * Odznaka poziomu Drabinki — jedyne miejsce, w którym pojawiają się kolory
 * --level-1..7 („im wyżej, tym cieplejsze światło"). Używać wszędzie tam,
 * gdzie pokazujemy poziom Lidera: katalog, profil, oferty, feed.
 */
export function LevelBadge({
  level,
  name,
  title,
  size = 'sm',
}: {
  level: number;
  name?: string;
  title?: string;
  // `md` — odznaka-bohater (awans w feedzie, nagłówki): większa i zawsze
  // z nazwą poziomu, bo sama liczba nie niesie znaczenia dla nowego gościa.
  size?: 'sm' | 'md';
}) {
  // Poziom 0 = jeszcze bez tytułu Lidera — odznaki nie pokazujemy (uczciwie,
  // ale bez piętnowania świeżych kont etykietą „Poziom 0").
  if (level < 1) return null;
  const clamped = Math.min(Math.max(level, 1), 7);
  return (
    <span
      className={size === 'md' ? 'level-badge level-badge--md' : 'level-badge'}
      data-level={clamped}
      title={title ?? `Poziom ${level} w Drabince Lidera`}
    >
      <span className="rungs" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      Poziom {level}
      {name ? ` · ${name}` : ''}
    </span>
  );
}

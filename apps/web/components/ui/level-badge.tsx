/**
 * Odznaka poziomu Drabinki — jedyne miejsce, w którym pojawiają się kolory
 * --level-1..7 („im wyżej, tym cieplejsze światło"). Używać wszędzie tam,
 * gdzie pokazujemy poziom Lidera: katalog, profil, oferty, feed.
 */
export function LevelBadge({
  level,
  name,
  title,
}: {
  level: number;
  name?: string;
  title?: string;
}) {
  const clamped = Math.min(Math.max(level, 1), 7);
  return (
    <span className="level-badge" data-level={clamped} title={title ?? `Poziom ${level} w Drabince Lidera`}>
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

/**
 * Szyna postępu — pionowa drabina 7 szczebli z zaznaczonym miejscem, w którym
 * stoisz, i szczeblem „w budowie" wypełnionym proporcjonalnie do progu.
 *
 * Dlaczego nie pasek postępu: awans w Portalu nie jest procentem, tylko
 * konkretnym szczeblem, na którym się stoi. Pasek sugerowałby, że da się
 * „dosunąć" poziom aktywnością — a można go tylko zdobyć uznaniem innych.
 *
 * Dostępność: SVG jest dekoracją, a cała treść idzie w aria-label — czytnik
 * ekranu dostaje jedno zdanie zamiast siedmiu bezużytecznych kształtów.
 */
export function ProgressRail({
  level,
  totalPoints,
  marketplacePoints,
  communityPoints,
  nextLevel,
}: {
  level: number;
  totalPoints: number;
  marketplacePoints: number;
  communityPoints: number;
  nextLevel: { level: number; name: string; pointsRequired: number; missingPoints: number } | null;
}) {
  const RUNGS = 7;
  // Udział szczebla „w budowie": ile drogi do następnego progu już za nami.
  const progress =
    nextLevel && nextLevel.pointsRequired > 0
      ? Math.min(Math.max(1 - nextLevel.missingPoints / nextLevel.pointsRequired, 0), 1)
      : level >= RUNGS
        ? 1
        : 0;

  const label = nextLevel
    ? `Poziom ${level}. Do poziomu ${nextLevel.level} (${nextLevel.name}) brakuje ${nextLevel.missingPoints} punktów.`
    : level >= RUNGS
      ? 'Poziom 7 — szczyt Drabinki.'
      : `Poziom ${level}.`;

  const pathTotal = marketplacePoints + communityPoints;
  const marketShare = pathTotal > 0 ? Math.round((marketplacePoints / pathTotal) * 100) : 0;

  return (
    <div className="progress-rail" role="img" aria-label={label}>
      <div className="progress-rail-art" aria-hidden="true">
        {Array.from({ length: RUNGS }, (_, i) => {
          const rung = RUNGS - i; // rysujemy od góry (7) w dół (1)
          const reached = rung <= level;
          const building = rung === level + 1;
          return (
            <span
              key={rung}
              className={`rail-rung${reached ? ' reached' : ''}${building ? ' building' : ''}`}
              style={
                {
                  '--rung-color': `var(--level-${rung})`,
                  '--rung-fill': building ? `${Math.round(progress * 100)}%` : undefined,
                } as React.CSSProperties
              }
            >
              <i />
              <em>{rung}</em>
            </span>
          );
        })}
      </div>

      <div className="progress-rail-copy">
        {level === 0 ? (
          <>
            <p className="rail-standing">Jesteś u podnóża</p>
            <p className="muted">
              Pierwszy szczebel zdobywa się oceną za zrealizowane zlecenie albo uznaną odpowiedzią w
              pytaniach grupy.
            </p>
          </>
        ) : (
          <>
            <p className="rail-standing">
              Stoisz na szczeblu <strong>{level}</strong>
            </p>
            <p className="muted">
              {totalPoints} pkt zaliczonych · zlecenia {marketplacePoints} · mentoring{' '}
              {communityPoints}
              {pathTotal > 0 && ` (${marketShare}/${100 - marketShare})`}
            </p>
          </>
        )}

        {nextLevel && (
          <p className="rail-next">
            Do poziomu {nextLevel.level} — {nextLevel.name}: brakuje{' '}
            <strong>{nextLevel.missingPoints} pkt</strong>
          </p>
        )}

        {/* Dwa cienkie paski = udział ścieżek. Od poziomu 4 obie muszą mieć
            wkład, więc widok równowagi jest informacją, nie ozdobą. */}
        {pathTotal > 0 && (
          <div className="rail-paths" aria-hidden="true">
            <span className="rail-path market" style={{ flexGrow: marketplacePoints || 0.001 }} />
            <span className="rail-path community" style={{ flexGrow: communityPoints || 0.001 }} />
          </div>
        )}
      </div>
    </div>
  );
}

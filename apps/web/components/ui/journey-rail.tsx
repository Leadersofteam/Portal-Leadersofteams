import Link from 'next/link';

import { LEVEL_NAMES } from '@/lib/levels';

// Oś Drogi Lidera (PL3). Jedna pionowa szyna, kamienie milowe od dołu do góry
// jak szczeble: dołączenie → kolejne poziomy → następny szczebel jako cel.
// Temperatura poziomu (--level-n) zawsze W PARZE z etykietą (czytelność bez
// rozróżniania barw — zasada portal-design). Zero punktów, zero księgi:
// daty awansów są jawne tak samo jak sam poziom; księga zostaje prywatna.
export interface JourneyData {
  joinedAt: string | null;
  achievements: Array<{ level: number; achievedAt: string }>;
}

export interface NextRung {
  level: number;
  name: string;
  pointsRequired: number;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

export function JourneyRail({
  journey,
  displayName,
  next,
}: {
  journey: JourneyData;
  displayName: string;
  next: NextRung | null;
}) {
  const steps = [...journey.achievements].sort((a, b) => a.level - b.level);
  return (
    <ol className="journey" aria-label={`Droga Lidera: ${displayName}`}>
      {journey.joinedAt && (
        <li className="journey-step journey-step--start">
          <span className="journey-dot" aria-hidden="true" />
          <div>
            <p className="journey-title">Wejście na Drogę</p>
            <p className="journey-meta">{fmt(journey.joinedAt)} · konto w Portalu, poziom 0</p>
          </div>
        </li>
      )}
      {steps.map((s) => (
        <li
          key={s.level}
          className="journey-step"
          style={{ '--lv': `var(--level-${s.level})` } as React.CSSProperties}
        >
          <span className="journey-dot" aria-hidden="true" />
          <div>
            <p className="journey-title">
              Poziom {s.level} · {LEVEL_NAMES[s.level - 1]}
            </p>
            <p className="journey-meta">{fmt(s.achievedAt)} · uznanie od drugiego człowieka</p>
          </div>
        </li>
      ))}
      {next && (
        <li
          className="journey-step journey-step--next"
          style={{ '--lv': `var(--level-${next.level})` } as React.CSSProperties}
        >
          <span className="journey-dot" aria-hidden="true" />
          <div>
            <p className="journey-title">
              Następny szczebel: poziom {next.level} · {next.name}
            </p>
            <p className="journey-meta">
              próg {next.pointsRequired} pkt — <Link href="/droga">jak wygląda cała Droga →</Link>
            </p>
          </div>
        </li>
      )}
    </ol>
  );
}

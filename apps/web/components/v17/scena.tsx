// Scena Drabinki: schody 7 węzłów; do węzła bieżącego biegną promienie od ludzi, którzy dali światło
// (port 1:1 z pro.js scena()). Dekoracja — aria-hidden; cała treść stoi obok w tekście.
import type { LevelRule } from '@/lib/levels';

export function Scena({ level, rules }: { level: number; rules: LevelRule[] }) {
  const N = rules.map((s, i) => ({ x: 40 + i * 58, y: 290 - i * 40, n: i + 1, nazwa: s.name }));
  const cel = N[Math.max(level - 1, 0)]!;
  const zr: Array<[number, number]> = [
    [330, 300],
    [390, 250],
    [410, 170],
    [250, 330],
    [170, 40],
    [80, 120],
  ];
  return (
    <div className="dr-scena" aria-hidden="true">
      <svg viewBox="0 0 420 340" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="bl" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <linearGradient id="sch" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--level-1)' }} />
            <stop offset=".5" style={{ stopColor: 'var(--primary-400)' }} />
            <stop offset="1" style={{ stopColor: 'var(--level-7)' }} />
          </linearGradient>
        </defs>
        <polyline
          points={N.map((n) => `${n.x},${n.y}`).join(' ')}
          fill="none"
          style={{ stroke: 'url(#sch)' }}
          strokeWidth={2}
          opacity=".35"
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
        {level ? (
          <polyline
            points={N.slice(0, level)
              .map((n) => `${n.x},${n.y}`)
              .join(' ')}
            fill="none"
            style={{ stroke: 'url(#sch)' }}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ) : null}
        {level
          ? zr.map(([x, y], i) => (
              <g key={i}>
                <line
                  x1={x}
                  y1={y}
                  x2={cel.x}
                  y2={cel.y}
                  style={{ stroke: i < 2 ? 'var(--warm)' : 'var(--primary-400)' }}
                  strokeWidth={1.2}
                  opacity=".35"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={9}
                  style={{
                    fill: 'var(--surface-3)',
                    stroke: i < 2 ? 'var(--warm)' : 'var(--line-2)',
                  }}
                  strokeWidth={1.5}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={3.5}
                  style={{ fill: i < 2 ? 'var(--warm)' : 'var(--primary-400)' }}
                />
              </g>
            ))
          : null}
        {N.map((n, i) => {
          const ma = i < level;
          const teraz = i === level - 1;
          const c = `var(--level-${n.n})`;
          const etk = teraz
            ? [`${n.nazwa} · tu jesteś`, 'var(--text-strong)', 700]
            : n.n === 5
              ? ['Mentor · LOT App', 'var(--text-muted)', 600]
              : n.n === 7
                ? ['Architekt Zespołów', 'var(--warm)', 650]
                : null;
          return (
            <g key={n.n}>
              {teraz ? (
                <>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={22}
                    style={{ fill: c }}
                    opacity=".45"
                    filter="url(#bl)"
                  />
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={17}
                    fill="none"
                    style={{ stroke: c }}
                    strokeWidth={1.5}
                    opacity=".6"
                  />
                </>
              ) : null}
              {n.n === 7 ? (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={18}
                  style={{ fill: 'var(--level-7)' }}
                  opacity=".25"
                  filter="url(#bl)"
                />
              ) : null}
              <circle
                cx={n.x}
                cy={n.y}
                r={ma ? 10 : 8}
                style={{ fill: ma ? c : 'var(--surface)', stroke: c }}
                strokeWidth={2}
              />
              {etk ? (
                <text
                  x={n.x - 18}
                  y={n.y + 4}
                  textAnchor="end"
                  style={{ fill: etk[1] as string, font: `${etk[2]} 12px var(--font-sans)` }}
                >
                  {etk[0]}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Okładka profilu bez zdjęcia: konstelacja — każdy punkt to ktoś, kto dał światło; linie zbiegają się
// do Lidera. Deterministyczna (ziarno stałe), więc serwer i klient rysują to samo.
export function OkladkaProfilu() {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cx = 120;
  const cy = 150;
  const el = [];
  for (let i = 0; i < 23; i++) {
    const x = 260 + rnd() * 760;
    const y = 20 + rnd() * 130;
    const r = 1.6 + rnd() * 2.6;
    el.push(
      <line
        key={`l${i}`}
        x1={x}
        y1={y}
        x2={cx}
        y2={cy}
        style={{ stroke: 'var(--level-5)', opacity: 0.05 + rnd() * 0.12 }}
        strokeWidth={1}
      />,
    );
    el.push(
      <circle
        key={`c${i}`}
        cx={x}
        cy={y}
        r={r}
        style={{
          fill: i % 6 === 0 ? 'var(--warm)' : 'var(--level-5)',
          opacity: 0.45 + rnd() * 0.5,
        }}
      />,
    );
  }
  return (
    <div className="prof-okl" aria-hidden="true">
      <svg viewBox="0 0 1040 168" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="po" cx="15%" cy="100%" r="90%">
            <stop offset="0" style={{ stopColor: 'var(--level-5)', stopOpacity: 0.35 }} />
            <stop offset=".6" style={{ stopColor: 'var(--primary-500)', stopOpacity: 0.08 }} />
            <stop offset="1" style={{ stopColor: 'var(--primary-500)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        <rect width="1040" height="168" style={{ fill: 'var(--surface)' }} />
        <rect width="1040" height="168" fill="url(#po)" />
        {el}
      </svg>
    </div>
  );
}

// Tło „sieć Liderów” (Maciej 26.11: „jaśniejsze z lekką siecią liderów przezroczystą”). Port 1:1 z
// docs/redesign-propozycje/v17/pro/tlo.js. Własny SVG, bez sieci i bez animacji (ADR-009). Stałe ziarno →
// ten sam obraz na serwerze i w przeglądarce. Węzły w kolorach szczebli; co ósmy ma pierścień jak awatar.
// L7 (ciepły) nie występuje: „ciepły = zapracowane” nie może być dekoracją.

const W = 1600;
const H = 1000;
const ILE = 64;

function siec() {
  let s = 29;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const kol = 8;
  const rz = ILE / kol;
  const p = Array.from({ length: ILE }, (_, i) => ({
    x: ((i % kol) + 0.15 + r() * 0.7) * (W / kol),
    y: (Math.floor(i / kol) + 0.15 + r() * 0.7) * (H / rz),
    l: 2 + Math.floor(r() * 5),
    r: 2.5 + r() * 3,
  }));
  const klucze = new Set<string>();
  p.forEach((a, i) =>
    p
      .map((b, j) => [Math.hypot(a.x - b.x, a.y - b.y), j] as const)
      .sort((x, y) => x[0] - y[0])
      .slice(1, 4)
      .forEach(([, j]) => klucze.add(i < j ? `${i}-${j}` : `${j}-${i}`)),
  );
  const linie = [...klucze].map((k) => {
    const [a, b] = k.split('-').map((i) => p[Number(i)]!) as [(typeof p)[0], (typeof p)[0]];
    return { k, x1: a.x.toFixed(0), y1: a.y.toFixed(0), x2: b.x.toFixed(0), y2: b.y.toFixed(0) };
  });
  const wezly = p.map((a, i) => ({
    i,
    pierscien: i % 8 === 3,
    kolor: `var(--level-${a.l})`,
    x: Number(a.x.toFixed(0)),
    y: Number(a.y.toFixed(0)),
    r: a.r.toFixed(1),
  }));
  return { linie, wezly };
}

const SIEC = siec();

export function TloSiec() {
  return (
    <svg
      className="tlo-siec"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g className="linie">
        {SIEC.linie.map(({ k, ...l }) => (
          <line key={k} {...l} />
        ))}
      </g>
      <g className="wezly">
        {SIEC.wezly.map((w) =>
          w.pierscien ? (
            <g key={w.i}>
              <circle
                cx={w.x}
                cy={w.y}
                r={15}
                style={{ fill: 'var(--bg)', stroke: w.kolor }}
                strokeWidth={2}
                strokeDasharray="10 4"
              />
              <circle cx={w.x} cy={w.y - 3} r={4} style={{ fill: w.kolor }} />
              <path d={`M${w.x - 7} ${w.y + 9}a7 6 0 0 1 14 0`} style={{ fill: w.kolor }} />
            </g>
          ) : (
            <circle key={w.i} cx={w.x} cy={w.y} r={w.r} style={{ fill: w.kolor }} />
          ),
        )}
      </g>
    </svg>
  );
}

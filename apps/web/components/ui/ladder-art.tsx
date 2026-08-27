/**
 * Wielki art drabiny — sygnatura wizualna hero. Siedem szczebli wspinających
 * się ku bursztynowi (te same tokeny co LevelBadge), lekko pochylonych jak
 * drabina oparta o ścianę. Czysty SVG, zero assetów zewnętrznych (ADR-009).
 */
/* Inline SVG w HTML honoruje zmienne CSS — jedno źródło skali poziomów
   w globals.css zamiast kopii hexów, która w PD1 została w tyle za paletą. */
const LEVELS = [1, 2, 3, 4, 5, 6, 7].map((n) => `var(--level-${n})`);

export function LadderArt() {
  return (
    <svg
      viewBox="0 0 340 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="ladder-art"
    >
      <defs>
        <linearGradient id="rail" x1="0" y1="480" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--border)" />
          <stop offset="0.55" stopColor="var(--primary-700)" />
          <stop offset="1" stopColor="var(--violet-500)" />
        </linearGradient>
        <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* boczne belki — perspektywa „drabiny opartej o ścianę" */}
      <path d="M96 478 L150 6" stroke="url(#rail)" strokeWidth="10" strokeLinecap="round" />
      <path d="M268 478 L250 6" stroke="url(#rail)" strokeWidth="10" strokeLinecap="round" />

      {/* szczeble: od stali (dół) po bursztyn (szczyt) */}
      {LEVELS.map((color, i) => {
        const t = i / 6;
        const y = 424 - t * 372;
        const x1 = 102 + t * 44;
        const x2 = 262 - t * 14;
        const isTop = i === 6;
        return (
          <g key={color} filter={isTop ? 'url(#glow)' : undefined}>
            <line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y - 6}
              stroke={color}
              strokeWidth={isTop ? 14 : 11}
              strokeLinecap="round"
              opacity={0.45 + t * 0.55}
            />
          </g>
        );
      })}

      {/* aureola szczytu — bursztyn poziomu 7 z tokenu, żeby motyw go widział */}
      <circle cx="204" cy="42" r="60" fill="var(--level-7)" opacity="0.08" />
      <circle cx="204" cy="42" r="26" fill="var(--level-7)" opacity="0.1" />
    </svg>
  );
}

// Znaki rozpoznawcze V17 „Światło”: pierścień Drabinki, szczebelki, monogramy, miernik, schodki,
// okładki rysowane w SVG. Port 1:1 z docs/redesign-propozycje/v17/pro/pro.js (zaakceptowana makieta).
// Komponenty czysto prezentacyjne — dane dostają z propsów (nic nie liczą po swojemu).
import type { CSSProperties, ReactNode } from 'react';

import { hue, initials, nf } from '@/lib/v17';
import { LEVEL_NAMES } from '@/lib/levels';

import { Ico } from './ico';
import type { IcoName } from './ico';

type Css = CSSProperties & Record<`--${string}`, string | number>;

// ── Pierścień Drabinki: 7 łuków; pełne = zdobyte szczeble, częściowy = droga do następnego ──
export function Pierscien({
  size,
  level,
  progress,
}: {
  size: number;
  level: number;
  progress: number;
}) {
  const r = size / 2 - 1.5;
  const c = size / 2;
  const seg = 360 / 7;
  const gap = 7;
  const pt = (a: number) => [
    c + r * Math.cos(((a - 90) * Math.PI) / 180),
    c + r * Math.sin(((a - 90) * Math.PI) / 180),
  ];
  const arc = (a0: number, a1: number) => {
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    return `M${x0!.toFixed(2)} ${y0!.toFixed(2)}A${r} ${r} 0 0 1 ${x1!.toFixed(2)} ${y1!.toFixed(2)}`;
  };
  const paths: ReactNode[] = [];
  for (let k = 1; k <= 7; k++) {
    const a0 = (k - 1) * seg + gap / 2;
    const a1 = k * seg - gap / 2;
    paths.push(
      <path
        key={k}
        d={arc(a0, a1)}
        style={{ stroke: k <= level ? `var(--level-${level})` : 'var(--line-2)' }}
      />,
    );
    if (k === level + 1 && progress > 0.02) {
      paths.push(
        <path
          key={`p${k}`}
          d={arc(a0, a0 + (a1 - a0) * progress)}
          style={{ stroke: `var(--level-${level})`, opacity: 0.6 }}
        />,
      );
    }
  }
  return (
    <svg
      className="pier"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      fill="none"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

// ── Monogram osoby / firmy ──
export function Aw({
  name,
  size = 44,
  ring = false,
  level = 0,
  progress = 0,
  company = false,
  industry,
  src,
}: {
  name: string;
  size?: number;
  ring?: boolean;
  level?: number;
  progress?: number;
  company?: boolean;
  industry?: string;
  src?: string | null;
}) {
  if (company) {
    // Firma: kwadratowy monogram w kolorze branży (nie zdjęcie, nie ikona budynku).
    const f = Math.round(size * 0.34);
    return (
      <span
        className="aw firma"
        style={
          { width: size, height: size, '--fs': `${f}px`, '--fh': hue(industry ?? name) } as Css
        }
        aria-hidden="true"
      >
        <span className="twarz" style={{ width: size, height: size }}>
          {initials(name).slice(0, 2)}
        </span>
      </span>
    );
  }
  const w = ring && level ? size - 9 : size;
  return (
    <span
      className="aw osoba"
      style={
        { width: size, height: size, '--fs': `${Math.round(w * 0.36)}px`, '--fh': hue(name) } as Css
      }
      aria-hidden="true"
    >
      {ring && level ? <Pierscien size={size} level={level} progress={progress} /> : null}
      <span className="twarz" style={{ width: w, height: w }}>
        {/* Zdjęcie z uploadu (własne API, ADR-009), gdy jest; inaczej monogram z gradientu nazwy. */}
        {src ? <img src={src} alt="" /> : initials(name)}
      </span>
    </span>
  );
}

// ── Szczebelki: 7 rosnących słupków, wypełnione do poziomu ──
export function Szczebelki({ level, h = 12 }: { level: number; h?: number }) {
  const bars: ReactNode[] = [];
  for (let k = 0; k < 7; k++) {
    const hh = 3 + ((h - 3) * k) / 6;
    bars.push(
      <rect
        key={k}
        x={k * 3.2}
        y={h - hh}
        width={2.2}
        height={hh}
        rx={1}
        style={{ fill: k < level ? 'currentColor' : 'var(--line-2)' }}
      />,
    );
  }
  return (
    <svg width={7 * 3.2} height={h} viewBox={`0 0 ${7 * 3.2} ${h}`} aria-hidden="true">
      {bars}
    </svg>
  );
}

export function Odznaka({ level, big = false }: { level: number; big?: boolean }) {
  if (!level) return <span className="odz nowy">Nowy w Portalu</span>;
  return (
    <span
      className={`odz${big ? ' duza' : ''}`}
      style={{ '--lv': `var(--level-${level})` } as Css}
      title={`Szczebel ${level} z 7`}
    >
      <Szczebelki level={level} h={big ? 14 : 12} />
      {LEVEL_NAMES[level - 1]}
    </span>
  );
}

// ── Miernik: wartość, „dojrzewa” (czeka) i opcjonalna kreska progu ──
export function Miernik({
  value,
  max,
  color,
  waiting = 0,
  mark = null,
  label,
}: {
  value: number;
  max: number;
  color: string;
  waiting?: number;
  mark?: number | null;
  label?: string;
}) {
  const p = Math.min(100, (value / max) * 100);
  const pc = Math.min(100 - p, (waiting / max) * 100);
  return (
    <div
      className="miernik"
      style={{ '--c': color } as Css}
      role="img"
      aria-label={label ?? `${nf(value)} z ${nf(max)}`}
    >
      <span style={{ width: `${p}%` }} />
      {waiting ? <em style={{ left: `${p}%`, width: `${pc}%` }} /> : null}
      {mark !== null ? <i className="prog" style={{ left: `${(mark / max) * 100}%` }} /> : null}
    </div>
  );
}

// ── Schodki: 7 stopni, zdobyte / bieżący z postępem / przed nami ──
export function Schodki({ level, progress }: { level: number; progress: number }) {
  const color = `var(--level-${Math.max(level, 1)})`;
  return (
    <>
      <div className="schodki" aria-hidden="true">
        {[...Array(7)].map((_, i) => {
          const h = 22 + i * 13;
          const st = { height: `${h}%`, '--c': color } as Css;
          if (i + 1 <= level) return <span key={i} className="ma" style={st} />;
          if (i === level)
            return (
              <span key={i} className="teraz" style={st}>
                <i style={{ height: `${Math.round(progress * 100)}%` }} />
              </span>
            );
          return <span key={i} style={{ height: `${h}%` }} />;
        })}
      </div>
      <div className="schodki-etykiety num">
        {[...Array(7)].map((_, i) => (
          <span key={i} className={i + 1 === level ? 'teraz' : ''}>
            {i + 1}
          </span>
        ))}
      </div>
    </>
  );
}

// ── Okładki rysowane w SVG (zero zdjęć z sieci); wzór zależy od branży ──
export type OkladkaRodzaj = 'hvac' | 'pv' | 'el' | 'wyk' | 'san' | 'chlod';
const BR: Record<OkladkaRodzaj, { c: string; ik: IcoName }> = {
  hvac: { c: 'var(--level-2)', ik: 'wind' },
  pv: { c: 'var(--br-pv)', ik: 'solar-panel' },
  el: { c: 'var(--primary-400)', ik: 'lightning' },
  wyk: { c: 'var(--violet-500)', ik: 'paint-roller' },
  san: { c: 'var(--br-san)', ik: 'drop' },
  chlod: { c: 'var(--br-chlod)', ik: 'snowflake' },
};

// Branża z API → wzór okładki. Nieznana branża dostaje neutralny wzór „el” (linie obwodu).
export function rodzajZBranzy(slugOrName: string | undefined): OkladkaRodzaj {
  const s = (slugOrName ?? '').toLowerCase();
  if (/fotowolt|pv|solar/.test(s)) return 'pv';
  if (/chłod|chlod|klimat/.test(s)) return 'chlod';
  if (/hvac|wentyl|pomp|ogrzew|grzew/.test(s)) return 'hvac';
  if (/wykoń|wykon|remont|malar/.test(s)) return 'wyk';
  if (/sanit|hydraul|woda|wod/.test(s)) return 'san';
  return 'el';
}

export function Okladka({
  rodzaj,
  seed = 1,
  ikona = true,
  id,
  style,
}: {
  rodzaj: OkladkaRodzaj;
  seed?: number;
  ikona?: boolean;
  id: string;
  style?: CSSProperties;
}) {
  const b = BR[rodzaj];
  const W = 320;
  const H = 160;
  const wz: ReactNode[] = [];
  if (rodzaj === 'hvac' || rodzaj === 'chlod') {
    for (let i = 0; i < 7; i++) {
      const y = 20 + i * 20 + (seed % 3) * 4;
      wz.push(
        <path
          key={i}
          d={`M-10 ${y} C 60 ${y - 18 - i * 2}, 120 ${y + 22}, 190 ${y} S 300 ${y - 16}, 340 ${y + 4}`}
          style={{ stroke: b.c, opacity: 0.18 + i * 0.07 }}
          fill="none"
          strokeWidth={1.6}
        />,
      );
    }
  } else if (rodzaj === 'pv') {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 7; c++) {
        const x = 30 + c * 44 + r * 14 - (seed % 2) * 10;
        const y = 26 + r * 30;
        wz.push(
          <path
            key={`${r}-${c}`}
            d={`M${x} ${y} l36 0 l-10 24 l-36 0z`}
            style={{ fill: b.c, opacity: 0.08 + ((r + c + seed) % 4) * 0.07 }}
          />,
        );
      }
  } else if (rodzaj === 'el') {
    const pts = [
      [0, 120],
      [60, 120],
      [90, 70],
      [150, 70],
      [170, 110],
      [240, 110],
      [270, 40],
      [330, 40],
    ];
    wz.push(
      <polyline
        key="a"
        points={pts.map((p) => p.join(',')).join(' ')}
        fill="none"
        style={{ stroke: b.c }}
        strokeWidth={2}
        opacity=".7"
      />,
    );
    pts
      .slice(1, -1)
      .forEach(([x, y], i) =>
        wz.push(<circle key={`c${i}`} cx={x} cy={y} r={4} style={{ fill: b.c }} />),
      );
    wz.push(
      <polyline
        key="b"
        points="0,80 40,80 70,140 330,140"
        fill="none"
        style={{ stroke: b.c }}
        strokeWidth={1.2}
        opacity=".3"
      />,
    );
  } else if (rodzaj === 'wyk') {
    for (let i = 0; i < 5; i++)
      wz.push(
        <rect
          key={i}
          x={40 + i * 52}
          y={20 + (i % 2) * 26}
          width={120}
          height={90}
          rx={6}
          transform={`rotate(${-12 + i * 6} ${100 + i * 52} 80)`}
          style={{ fill: b.c, opacity: 0.07 + i * 0.05 }}
        />,
      );
  } else {
    for (let i = 0; i < 6; i++)
      wz.push(
        <circle
          key={i}
          cx={240 - seed * 10}
          cy={80}
          r={18 + i * 22}
          fill="none"
          style={{ stroke: b.c, opacity: 0.5 - i * 0.07 }}
          strokeWidth={6 - i * 0.7}
        />,
      );
  }
  return (
    <div className="okl" aria-hidden="true" style={style}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: b.c, stopOpacity: 0.22 }} />
            <stop offset="1" style={{ stopColor: b.c, stopOpacity: 0.03 }} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${id})`} />
        {wz}
      </svg>
      {ikona ? (
        <span className="ikon">
          <Ico n={b.ik} />
        </span>
      ) : null}
    </div>
  );
}

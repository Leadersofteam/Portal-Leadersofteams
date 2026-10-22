import { ImageResponse } from 'next/og';

/**
 * Wspólny szablon obrazów OG — „credential card" Leaders of Teams.
 * Jedno tło, jeden układ: eyebrow z marką (drabinka z bursztynowym szczeblem),
 * tytuł, podtytuł i rząd plakietek. Używany przez root OG i wszystkie
 * opengraph-image.tsx encji (lider/zlecenie/grupa/wątek). Renderuje next/og — 0 zł.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const LEVEL_COLORS: Record<number, string> = {
  1: '#94a3b8',
  2: '#60a5fa',
  3: '#818cf8',
  4: '#a78bfa',
  5: '#c084fc',
  6: '#f472b6',
  7: '#fbbf24',
};

export function levelColor(level: number): string {
  return LEVEL_COLORS[Math.min(Math.max(level, 1), 7)] ?? '#94a3b8';
}

export interface OgChip {
  label: string;
  color?: string;
}

export function credentialCard({
  kicker,
  title,
  subtitle,
  chips = [],
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  chips?: OgChip[];
}) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        background: 'linear-gradient(135deg, #0a0b12 0%, #1e1b4b 55%, #4f46e5 130%)',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {/* Znak marki — te same liczby co components/ui/logo.tsx (siatka 32). */}
        <svg width="44" height="44" viewBox="0 0 32 32">
          <defs>
            <linearGradient
              id="og-mark"
              x1="0"
              y1="32"
              x2="32"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#5b21b6" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="url(#og-mark)" />
          <path d="M9.2 26.5 11.4 5.5h1.9l-1.9 21z" fill="#fff" />
          <path d="M22.8 26.5 20.6 5.5h-1.9l1.9 21z" fill="#fff" />
          <rect x="9.78" y="19.7" width="12.45" height="2.6" fill="#fff" />
          <rect x="10.4" y="13.7" width="11.19" height="2.6" fill="#fff" />
          <rect x="9.43" y="7.7" width="13.13" height="2.6" fill="#fbbf24" />
        </svg>
        <div style={{ display: 'flex', fontSize: 30, opacity: 0.9, letterSpacing: 1 }}>
          {kicker}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 60 ? 52 : 66,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ display: 'flex', fontSize: 32, opacity: 0.85, marginTop: 16 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        {chips.map((chip, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              background: chip.color ? `${chip.color}2e` : 'rgba(255,255,255,0.14)',
              border: chip.color ? `2px solid ${chip.color}` : '2px solid rgba(255,255,255,0.25)',
              color: chip.color ?? '#ffffff',
              borderRadius: 16,
              padding: '14px 26px',
              fontSize: 30,
              fontWeight: 600,
            }}
          >
            {chip.label}
          </div>
        ))}
      </div>
    </div>,
    OG_SIZE,
  );
}

import { ImageResponse } from 'next/og';

import { serverApi } from '@/lib/server-api';

// Dynamiczny obraz OG profilu Lidera — Drabinka jako dzielony, prestiżowy
// credential (nazwisko + poziom + ocena + branża). Renderowany przez next/og (0 zł).
export const alt = 'Profil Lidera — Leaders of Teams';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Data {
  profile: {
    displayName: string;
    headline: string;
    level: number;
    averageRating: number | null;
    reviewCount: number;
    industry: { name: string };
  };
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<Data>(`/leaders/${id}`).catch(() => null);
  const p = data?.profile;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, opacity: 0.85, letterSpacing: 1 }}>
          Leaders of Teams
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>
            {p?.displayName ?? 'Lider'}
          </div>
          <div style={{ display: 'flex', fontSize: 34, opacity: 0.9, marginTop: 16 }}>
            {p?.headline ?? 'Profil Lidera'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.16)',
              borderRadius: 16,
              padding: '18px 28px',
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            Poziom {p?.level ?? 0} w Drabince
          </div>
          {p && p.reviewCount > 0 ? (
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.16)',
                borderRadius: 16,
                padding: '18px 28px',
                fontSize: 34,
              }}
            >
              ★ {p.averageRating}/5 ({p.reviewCount})
            </div>
          ) : null}
          {p?.industry?.name ? (
            <div style={{ display: 'flex', fontSize: 30, opacity: 0.85 }}>{p.industry.name}</div>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}

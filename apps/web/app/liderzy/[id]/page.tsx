import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { JsonLd } from '@/components/json-ld';
import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/ui/level-badge';
import { leaderProfileJsonLd } from '@/lib/jsonld';
import { serverApi } from '@/lib/server-api';

interface PublicProfile {
  profile: {
    id: string;
    displayName: string;
    headline: string;
    bio: string | null;
    level: number;
    averageRating: number | null;
    reviewCount: number;
    industry: { name: string };
    portfolioItems: Array<{
      id: string;
      title: string;
      url: string | null;
      description: string | null;
    }>;
  };
}

// cache(): jeden fetch współdzielony przez generateMetadata i komponent (per żądanie).
const getProfile = cache((id: string) => serverApi<PublicProfile>(`/leaders/${id}`));

const clip = (s: string, n = 155) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getProfile(id);
  if (!data) return { title: 'Lider nie znaleziony' };
  const { profile } = data;
  const rating =
    profile.reviewCount > 0 ? ` · ★ ${profile.averageRating}/5 (${profile.reviewCount})` : '';
  const title = `${profile.displayName} — ${profile.headline} | Leaders of Teams`;
  const description = clip(
    `${profile.displayName}: ${profile.industry.name}, poziom ${profile.level} w Drabince Lidera${rating}. ${profile.bio ?? profile.headline}`,
  );
  return {
    title,
    description,
    alternates: { canonical: `/liderzy/${id}` },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `/liderzy/${id}`,
    },
  };
}

export default async function LeaderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProfile(id);
  if (!data) notFound();
  const { profile } = data;

  return (
    <main>
      <JsonLd
        data={leaderProfileJsonLd({
          id: profile.id,
          displayName: profile.displayName,
          headline: profile.headline,
          bio: profile.bio,
          level: profile.level,
          averageRating: profile.averageRating,
          reviewCount: profile.reviewCount,
          industryName: profile.industry.name,
        })}
      />
      <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'center' }}>
        <Avatar name={profile.displayName} size="lg" />
        <div>
          <h1 style={{ margin: 0 }}>{profile.displayName}</h1>
          <p className="meta muted" style={{ margin: '0.45rem 0 0' }}>
            {profile.industry.name} · <LevelBadge level={profile.level} />
            {profile.reviewCount > 0 && (
              <>
                {' '}
                <span className="badge">
                  ★ {profile.averageRating}/5 ({profile.reviewCount}{' '}
                  {profile.reviewCount === 1 ? 'ocena' : 'ocen'})
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <p className="mt-2" style={{ fontSize: '1.1rem' }}>
        {profile.headline}
      </p>
      {profile.bio && <p className="description">{profile.bio}</p>}

      {profile.portfolioItems.length > 0 && (
        <section>
          <h2>Portfolio</h2>
          <div className="feature-grid">
            {profile.portfolioItems.map((item) => (
              <div key={item.id} className="card">
                <h3>{item.title}</h3>
                {item.description && <p>{item.description}</p>}
                {item.url && (
                  <p>
                    <a href={item.url} rel="nofollow noopener" target="_blank">
                      Zobacz →
                    </a>
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

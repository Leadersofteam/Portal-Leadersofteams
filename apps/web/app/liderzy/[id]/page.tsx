import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { FollowButton } from '@/app/profil/[handle]/follow-button';
import { JsonLd } from '@/components/json-ld';
import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/ui/level-badge';
import { leaderProfileJsonLd } from '@/lib/jsonld';
import { levelName } from '@/lib/levels';
import { serverApi } from '@/lib/server-api';

interface PublicProfile {
  profile: {
    id: string;
    userId: string;
    displayName: string;
    avatarFileId: string | null;
    headline: string;
    bio: string | null;
    level: number;
    averageRating: number | null;
    reviewCount: number;
    completedOrders: number;
    industry: { name: string };
    portfolioItems: Array<{
      id: string;
      title: string;
      url: string | null;
      description: string | null;
      imageFileId: string | null;
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

interface LeaderReviews {
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    publishedAt: string | null;
    orderTitle: string;
    companyName: string;
  }>;
  breakdown: Record<string, number>;
}

export default async function LeaderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProfile(id);
  if (!data) notFound();
  const { profile } = data;
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me').catch(() => null);
  const isSelf = me?.user?.id === profile.userId;
  const initiallyFollowing =
    me?.user && !isSelf
      ? ((
          await serverApi<{ following: boolean }>(`/users/${profile.userId}/follow`).catch(
            () => null,
          )
        )?.following ?? false)
      : false;
  const reviewsData =
    profile.reviewCount > 0
      ? await serverApi<LeaderReviews>(`/leaders/${id}/reviews`).catch(() => null)
      : null;

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
      {/* Nagłówek klasą, nie inline-flexem (PD3) — wspólny hook CSS z resztą
          „wiarygodności". Do 21.08 poziom 0 zostawiał wiszącą kropkę po branży
          (LevelBadge zwraca null), a ocena tonęła w meta — separator stawiamy
          tylko przy realnej odznace. */}
      <header className="leader-head">
        <Avatar
          name={profile.displayName}
          size="lg"
          src={profile.avatarFileId ? `/api/v1/files/${profile.avatarFileId}/thumb` : null}
        />
        <div className="leader-head-main">
          <h1>{profile.displayName}</h1>
          <p className="leader-head-meta">
            {profile.industry.name}
            {profile.level >= 1 && (
              <>
                {' · '}
                <LevelBadge level={profile.level} name={levelName(profile.level)} />
              </>
            )}
          </p>
        </div>
        {me?.user && !isSelf && (
          <FollowButton userId={profile.userId} initiallyFollowing={initiallyFollowing} />
        )}
      </header>
      <p className="mt-2" style={{ fontSize: '1.1rem' }}>
        {profile.headline}
      </p>
      {profile.bio && <p className="description">{profile.bio}</p>}

      {/* Pas zaufania — lustro kart z profilu Firmy (feature-grid + stat-number):
          jeden język wiarygodności po obu stronach rynku. Karta pojawia się
          tylko dla ZAPRACOWANEGO faktu — świeżemu Liderowi nie wystawiamy zer. */}
      {(profile.reviewCount > 0 || profile.completedOrders > 0) && (
        <section className="feature-grid mt-2">
          {profile.completedOrders > 0 && (
            <div className="card">
              <h3>Zrealizowane zlecenia</h3>
              <p className="stat-number">{profile.completedOrders}</p>
              <p className="muted">potwierdzone przez Firmy po odbiorze</p>
            </div>
          )}
          {profile.reviewCount > 0 && (
            <div className="card">
              <h3>Ocena od Firm</h3>
              <p className="stat-number">★ {profile.averageRating}/5</p>
              <p className="muted">
                {profile.reviewCount} {profile.reviewCount === 1 ? 'ocena' : 'ocen'} — publikowane
                symultanicznie, bez odwetu
              </p>
            </div>
          )}
        </section>
      )}

      {reviewsData && reviewsData.reviews.length > 0 && (
        <section>
          <h2>Opinie Firm ({profile.reviewCount})</h2>
          <div className="mt-1" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <span key={stars} className="badge">
                {stars}★ × {reviewsData.breakdown[String(stars)] ?? 0}
              </span>
            ))}
          </div>
          {reviewsData.reviews.map((review) => (
            <div key={review.id} className="card mt-2">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <strong>
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </strong>
                <span className="muted">{review.companyName}</span>
              </div>
              <p className="muted" style={{ margin: '0.3rem 0 0' }}>
                zlecenie: {review.orderTitle}
              </p>
              {review.comment && <p className="pre-wrap mt-1">{review.comment}</p>}
            </div>
          ))}
        </section>
      )}

      {profile.portfolioItems.length > 0 && (
        <section>
          <h2>Portfolio</h2>
          <div className="feature-grid">
            {profile.portfolioItems.map((item) => (
              <div key={item.id} className="card">
                {item.imageFileId && (
                  <img
                    src={`/api/v1/files/${item.imageFileId}/full`}
                    alt={item.title}
                    className="portfolio-image"
                    loading="lazy"
                  />
                )}
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

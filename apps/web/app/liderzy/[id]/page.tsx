import { notFound } from 'next/navigation';

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

export default async function LeaderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<PublicProfile>(`/leaders/${id}`);
  if (!data) notFound();
  const { profile } = data;

  return (
    <main>
      <h1>{profile.displayName}</h1>
      <p className="meta muted">
        {profile.industry.name} ·{' '}
        <span className="badge accent">Poziom {profile.level} w Drabince Lidera</span>
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
      <p style={{ fontSize: '1.1rem' }}>{profile.headline}</p>
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

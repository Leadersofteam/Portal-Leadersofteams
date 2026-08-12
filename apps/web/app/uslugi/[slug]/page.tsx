import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { FollowButton } from '@/app/profil/[handle]/follow-button';
import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/ui/level-badge';
import { serverApi } from '@/lib/server-api';

import { InquiryForm } from './inquiry-form';

interface ListingDetail {
  listing: {
    id: string;
    slug: string;
    title: string;
    description: string;
    priceFrom: number;
    images: string[];
    tags: Array<{ name: string; slug: string }>;
    packages: Array<{
      tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
      name: string;
      priceDeclared: number;
      scope: string;
      deliveryDays: number;
    }>;
    industry: { id: string; name: string };
    leader: {
      userId: string;
      displayName: string;
      avatarFileId: string | null;
      headline: string;
      level: number;
      averageRating: number | null;
      reviewCount: number;
    };
  };
}

const TIER_LABELS: Record<string, string> = {
  BASIC: 'Podstawowy',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

const getListing = cache((slug: string) =>
  serverApi<ListingDetail>(`/listings/slug/${encodeURIComponent(slug)}`),
);

const clip = (s: string, n = 155) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const plnFormat = new Intl.NumberFormat('pl-PL');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getListing(slug);
  if (!data) return { title: 'Usługa nie znaleziona' };
  const { listing } = data;
  const title = `${listing.title} — ${listing.leader.displayName} | Usługi Leaders of Teams`;
  const description = clip(listing.description);
  return {
    title,
    description,
    alternates: { canonical: `/uslugi/${slug}` },
    openGraph: { type: 'website', title, description, url: `/uslugi/${slug}` },
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getListing(slug);
  if (!data) notFound();
  const { listing } = data;

  const me = await serverApi<{
    user: { id: string } | null;
  }>('/auth/me').catch(() => null);
  const companies = me?.user
    ? ((await serverApi<{ companies: Array<{ id: string; name: string }> }>('/me/companies')) ?? {
        companies: [],
      })
    : { companies: [] };
  const isOwner = me?.user?.id === listing.leader.userId;
  const initiallyFollowing =
    me?.user && !isOwner
      ? ((
          await serverApi<{ following: boolean }>(`/users/${listing.leader.userId}/follow`).catch(
            () => null,
          )
        )?.following ?? false)
      : false;

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/uslugi">← Usługi</Link>
      </div>

      <h1>{listing.title}</h1>
      <div
        className="mt-1"
        style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Avatar
          name={listing.leader.displayName}
          src={
            listing.leader.avatarFileId
              ? `/api/v1/files/${listing.leader.avatarFileId}/thumb`
              : null
          }
        />
        <div>
          <strong>{listing.leader.displayName}</strong>
          <div className="meta">{listing.leader.headline}</div>
        </div>
        <LevelBadge level={listing.leader.level} />
        {me?.user && !isOwner && (
          <FollowButton userId={listing.leader.userId} initiallyFollowing={initiallyFollowing} />
        )}
        {listing.leader.reviewCount > 0 && (
          <span className="badge">
            ★ {listing.leader.averageRating}/5 ({listing.leader.reviewCount})
          </span>
        )}
        <span className="badge">{listing.industry.name}</span>
        {listing.tags.map((tag) => (
          <Link key={tag.slug} className="badge" href={`/uslugi?tag=${tag.slug}`}>
            #{tag.name}
          </Link>
        ))}
      </div>

      {listing.images.length > 0 && (
        <div className="feature-grid mt-3">
          {listing.images.map((fileId) => (
            <img
              key={fileId}
              src={`/api/v1/files/${fileId}/full`}
              alt=""
              style={{
                width: '100%',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}
              loading="lazy"
            />
          ))}
        </div>
      )}

      <h2>Opis usługi</h2>
      <p className="description">{listing.description}</p>

      <h2>Pakiety</h2>
      <p className="muted">
        Ceny są deklaracją Lidera — rozliczenie następuje bezpośrednio między stronami, a formalny
        przebieg zapewnia zlecenie utworzone z zapytania.
      </p>
      <div className="package-grid">
        {listing.packages.map((pkg) => (
          <div
            key={pkg.tier}
            className={pkg.tier === 'PREMIUM' ? 'package-card premium' : 'package-card'}
          >
            <span className="tier">{TIER_LABELS[pkg.tier] ?? pkg.tier}</span>
            <strong>{pkg.name}</strong>
            <span className="price">{plnFormat.format(pkg.priceDeclared)} zł</span>
            <span className="muted">do {pkg.deliveryDays} dni</span>
            <p className="pre-wrap" style={{ margin: 0, fontSize: '0.92rem' }}>
              {pkg.scope}
            </p>
          </div>
        ))}
      </div>

      {!isOwner && (
        <>
          <h2>Zapytaj o tę usługę</h2>
          {me?.user ? (
            companies.companies.length > 0 ? (
              <InquiryForm
                listingId={listing.id}
                companies={companies.companies}
                packages={listing.packages.map((p) => p.tier)}
              />
            ) : (
              <p className="muted">
                Zapytania wysyłają Firmy — <Link href="/firma/nowa">dodaj profil swojej firmy</Link>
                , żeby napisać do Lidera.
              </p>
            )
          ) : (
            <p className="muted">
              <Link href="/logowanie">Zaloguj się</Link>, żeby wysłać zapytanie do Lidera.
            </p>
          )}
        </>
      )}

      <p className="mt-3">
        Zobacz też <Link href="/uslugi">pozostałe usługi</Link> albo{' '}
        <Link href="/zlecenia/nowe">opublikuj własne zlecenie</Link>.
      </p>
    </main>
  );
}

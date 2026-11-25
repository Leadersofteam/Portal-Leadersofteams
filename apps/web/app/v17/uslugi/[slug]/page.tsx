import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { FollowButton } from '@/app/profil/[handle]/follow-button';
import { InquiryForm } from '@/app/uslugi/[slug]/inquiry-form';
import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Pakiety } from '@/components/v17/pakiety';
import { Rama, Stopka } from '@/components/v17/rama';
import { Ocena, Wstecz } from '@/components/v17/rynek';
import { Aw, Odznaka, Okladka, rodzajZBranzy } from '@/components/v17/znaki';
import { serverApi, serverApiStatus } from '@/lib/server-api';
import { loadJa } from '@/lib/v17-data';

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
      completedOrders?: number;
    };
  };
}

const TIER_LABELS: Record<string, string> = {
  BASIC: 'Podstawowy',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

// 404 → notFound(); inna porażka API → błąd ekranu (error.tsx), nie fałszywe „nie znaleziono”.
const getListing = cache(async (slug: string) => {
  const r = await serverApiStatus<ListingDetail>(`/listings/slug/${encodeURIComponent(slug)}`);
  if (r.status === 404) return null;
  if (!r.data) throw new Error(`Usługa ${slug}: API zwróciło ${r.status}`);
  return r.data;
});

const clip = (s: string, n = 155) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getListing(slug).catch(() => null);
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

export default async function UslugaV17({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getListing(slug);
  if (!data) notFound();
  const { listing } = data;
  const { leader } = listing;

  const ja = await loadJa();
  const companies = ja
    ? ((await serverApi<{ companies: Array<{ id: string; name: string }> }>('/me/companies')) ?? {
        companies: [],
      })
    : { companies: [] };
  const isOwner = ja?.id === leader.userId;
  const initiallyFollowing =
    ja && !isOwner
      ? ((await serverApi<{ following: boolean }>(`/users/${leader.userId}/follow`))?.following ??
        false)
      : false;
  const avatar = leader.avatarFileId ? `/api/v1/files/${leader.avatarFileId}/thumb` : null;

  return (
    <Rama
      aktywny="uslugi"
      szeroka
      ja={
        ja
          ? {
              name: ja.displayName,
              level: ja.level,
              handle: ja.handle,
              avatarFileId: ja.avatarFileId,
            }
          : null
      }
    >
      <div className="rn-us">
        <div className="gl">
          <Wstecz href="/uslugi">Usługi</Wstecz>
          <div className="nad" style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            {listing.industry.name}
          </div>
          <h1>{listing.title}</h1>
          <div className="rn-lw">
            <Aw name={leader.displayName} size={36} src={avatar} />
            <b>{leader.displayName}</b>
            <Odznaka level={leader.level} />
            <span className="sep">·</span>
            <Ocena srednia={leader.averageRating} liczba={leader.reviewCount} />
            {ja && !isOwner ? (
              <FollowButton userId={leader.userId} initiallyFollowing={initiallyFollowing} />
            ) : null}
          </div>
          <div className="rn-ok">
            {listing.images.length > 0 ? (
              <div className="okl">
                <img
                  src={`/api/v1/files/${listing.images[0]}/full`}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <Okladka rodzaj={rodzajZBranzy(listing.industry.name)} id={`ok-${listing.id}`} />
            )}
          </div>
        </div>

        <Pakiety
          wlasciciel={isOwner}
          pakiety={listing.packages.map((p) => ({
            tier: p.tier,
            etykieta: TIER_LABELS[p.tier] ?? p.tier,
            nazwa: p.name,
            cena: p.priceDeclared,
            dni: p.deliveryDays,
            zakres: p.scope,
          }))}
        />

        <div className="tr">
          <section className="rn-sek">
            <h2>O usłudze</h2>
            {listing.description.split(/\n{2,}/).map((p, i) => (
              <p key={i} style={{ whiteSpace: 'pre-wrap' }}>
                {p}
              </p>
            ))}
            {listing.tags.length > 0 ? (
              <p>
                {listing.tags.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/uslugi?tag=${t.slug}`}
                    style={{ marginRight: 12, color: 'var(--text-muted)' }}
                  >
                    #{t.name}
                  </Link>
                ))}
              </p>
            ) : null}
            {listing.images.length > 1
              ? listing.images.slice(1).map((fileId) => (
                  <div className="rn-ok" key={fileId}>
                    <div className="okl">
                      <img
                        src={`/api/v1/files/${fileId}/full`}
                        alt=""
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                ))
              : null}
          </section>

          <section className="rn-sek">
            <h2>O Liderze</h2>
            <div className="rn-lider">
              <div className="gl-l">
                <Aw name={leader.displayName} size={88} ring level={leader.level} src={avatar} />
                <div>
                  <b>{leader.displayName}</b>
                  <small>{leader.headline}</small>
                  <Odznaka level={leader.level} big />
                </div>
              </div>
              <p className="rn-pod">
                Punkty daje wyłącznie druga osoba — <b>ocena po zleceniu albo uznana odpowiedź</b>.
                Szczebel Lidera nie jest do kupienia.
                {leader.completedOrders ? ` Zrealizowane zlecenia: ${leader.completedOrders}.` : ''}
              </p>
            </div>
          </section>

          <section className="rn-sek">
            <h2>
              Oceny po zleceniach
              <small>
                {leader.reviewCount > 0
                  ? `${String(leader.averageRating).replace('.', ',')} · ${leader.reviewCount} ${leader.reviewCount === 1 ? 'ocena' : 'ocen'}`
                  : 'jeszcze bez ocen'}
              </small>
            </h2>
            {leader.reviewCount === 0 ? (
              <Komunikat
                ikona="chat-teardrop-text"
                tytul="Ten Lider nie ma jeszcze ocen"
                opis="Pierwsza ocena pojawi się po zrealizowanym zleceniu — dopiero wtedy Lider dostaje za nią punkty."
              />
            ) : null}
          </section>

          {isOwner ? (
            <section className="rn-sek">
              <Link className="vbtn obrys" href={`/uslugi/${listing.slug}/edytuj`}>
                <Ico n="pencil-simple" />
                Edytuj tę usługę
              </Link>
            </section>
          ) : (
            <section className="rn-sek" id="zapytaj">
              <h2>Zapytaj o tę usługę</h2>
              {ja ? (
                companies.companies.length > 0 ? (
                  <InquiryForm
                    listingId={listing.id}
                    companies={companies.companies}
                    packages={listing.packages.map((p) => p.tier)}
                  />
                ) : (
                  <p>
                    Zapytania wysyłają Firmy —{' '}
                    <Link href="/firma/nowa">dodaj profil swojej firmy</Link>, żeby napisać do
                    Lidera.
                  </p>
                )
              ) : (
                <p>
                  <Link href="/logowanie">Zaloguj się</Link>, żeby wysłać zapytanie do Lidera.
                </p>
              )}
            </section>
          )}
          <div className="rn-stopka rn-st-szer">
            <Stopka />
          </div>
        </div>
      </div>
    </Rama>
  );
}

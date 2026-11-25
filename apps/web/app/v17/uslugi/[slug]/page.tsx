import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { FollowButton } from '@/app/profil/[handle]/follow-button';
import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Pakiety } from '@/components/v17/pakiety';
import type { ZapytanieDane } from '@/components/v17/pakiety';
import { Rama, Stopka } from '@/components/v17/rama';
import { Ocena, Wstecz } from '@/components/v17/rynek';
import { Aw, Miernik, Odznaka, Okladka, rodzajRynek } from '@/components/v17/znaki';
import type { LevelRule } from '@/lib/levels';
import { serverApi, serverApiStatus } from '@/lib/server-api';
import { levelsOrFallback, nf, plural, progress, temu } from '@/lib/v17';
import { dniDoDojrzenia, loadJa, loadSwiatlo, mojaZLedgera } from '@/lib/v17-data';

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
      profileId?: string;
      handle?: string | null;
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

interface OcenyLidera {
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    publishedAt: string;
    orderTitle: string;
    companyName: string;
    points?: number | null;
    weight?: number | null;
    maturesAt?: string | null;
  }>;
}

const TIER_LABELS: Record<string, string> = {
  BASIC: 'Podstawowy',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

const dm = (iso: string) =>
  new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });

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
  const isOwner = ja?.id === leader.userId;
  const [companies, following, oceny, swiatlo, levels] = await Promise.all([
    ja && !isOwner
      ? serverApi<{ companies: Array<{ id: string; name: string }> }>('/me/companies')
      : null,
    ja && !isOwner ? serverApi<{ following: boolean }>(`/users/${leader.userId}/follow`) : null,
    // Oceny i Oś światła Lidera to ISTNIEJĄCE publiczne endpointy (nie liczymy punktów od nowa).
    leader.profileId ? serverApi<OcenyLidera>(`/leaders/${leader.profileId}/reviews`) : null,
    leader.handle ? loadSwiatlo(leader.handle, 12) : null,
    serverApi<{ levels: LevelRule[] }>('/ladder/levels'),
  ]);
  const avatar = leader.avatarFileId ? `/api/v1/files/${leader.avatarFileId}/thumb` : null;
  const rules = levelsOrFallback(levels?.levels);
  const lid = swiatlo ? mojaZLedgera(swiatlo, rules) : null;
  const nastepny = lid?.next ?? null;
  // Kreska na pasku: minimalny udział ścieżki w progu następnego szczebla (z konfiguracji Drabinki, nie z makiety).
  const minSciezka = nastepny
    ? Math.round((nastepny.pointsRequired * nastepny.minPathSharePct) / 100)
    : 0;
  const kolor = `var(--level-${Math.max(leader.level, 1)})`;

  const zapytanie: ZapytanieDane | null = isOwner
    ? null
    : !ja
      ? { tryb: 'gosc', next: `/uslugi/${listing.slug}` }
      : (companies?.companies.length ?? 0) > 0
        ? { tryb: 'formularz', listingId: listing.id, firmy: companies!.companies }
        : { tryb: 'bez-firmy' };
  const lista = oceny?.reviews.slice(0, 3) ?? [];

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
              <FollowButton
                userId={leader.userId}
                initiallyFollowing={following?.following ?? false}
              />
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
              <Okladka rodzaj={rodzajRynek(listing.industry.name)} id={`ok-${listing.id}`} />
            )}
          </div>
        </div>

        <Pakiety
          zapytanie={zapytanie}
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
                <Aw
                  name={leader.displayName}
                  size={88}
                  ring
                  level={leader.level}
                  progress={lid ? progress(leader.level, lid.razem, rules) : 0}
                  src={avatar}
                />
                <div>
                  <b>{leader.displayName}</b>
                  <small>{leader.headline}</small>
                  <Odznaka level={leader.level} big />
                </div>
              </div>
              {lid && nastepny ? (
                <>
                  <div className="rn-sc">
                    <div>
                      <div className="w">
                        <span>Rynek: oceny po zleceniach</span>
                        <b>
                          {nf(lid.rynek)}
                          {lid.czekaRynek ? (
                            <span className="dojrzewa"> +{nf(lid.czekaRynek)}</span>
                          ) : null}
                        </b>
                      </div>
                      <Miernik
                        value={lid.rynek}
                        max={nastepny.pointsRequired}
                        color={kolor}
                        waiting={lid.czekaRynek}
                        mark={minSciezka}
                      />
                    </div>
                    <div>
                      <div className="w">
                        <span>Społeczność: uznane odpowiedzi</span>
                        <b>{nf(lid.spol)}</b>
                      </div>
                      <Miernik
                        value={lid.spol}
                        max={nastepny.pointsRequired}
                        color={kolor}
                        waiting={lid.czekaSpol}
                        mark={minSciezka}
                      />
                    </div>
                  </div>
                  <ul className="rn-wym" aria-label={`Wymagania do poziomu ${nastepny.name}`}>
                    <li className={lid.rynek >= minSciezka ? 'ok' : undefined}>
                      <Ico n={lid.rynek >= minSciezka ? 'check-circle' : 'circle'} />
                      Rynek: min. {nf(minSciezka)} pkt
                      <small>
                        {lid.rynek >= minSciezka
                          ? nf(lid.rynek)
                          : `brakuje ${nf(minSciezka - lid.rynek)}`}
                      </small>
                    </li>
                    <li className={lid.spol >= minSciezka ? 'ok' : undefined}>
                      <Ico n={lid.spol >= minSciezka ? 'check-circle' : 'circle'} />
                      Społeczność: min. {nf(minSciezka)} pkt
                      <small>
                        {lid.spol >= minSciezka
                          ? nf(lid.spol)
                          : `brakuje ${nf(minSciezka - lid.spol)}`}
                      </small>
                    </li>
                    <li className={lid.razem >= nastepny.pointsRequired ? 'ok' : undefined}>
                      <Ico n={lid.razem >= nastepny.pointsRequired ? 'check-circle' : 'circle'} />
                      Razem {nf(nastepny.pointsRequired)} pkt
                      <small>
                        {lid.razem >= nastepny.pointsRequired
                          ? nf(lid.razem)
                          : `brakuje ${nf(nastepny.missingPoints)}`}
                      </small>
                    </li>
                  </ul>
                </>
              ) : null}
              <p className="rn-pod">
                {nastepny ? (
                  <>
                    Kreska na pasku to {nf(minSciezka)} pkt:{' '}
                    <b>
                      {nastepny.minPathSharePct}% progu „{nastepny.name}”
                    </b>
                    .{' '}
                  </>
                ) : null}
                Punkty daje wyłącznie druga osoba — ocena po zleceniu albo uznana odpowiedź.
                {leader.handle ? (
                  <>
                    {' '}
                    <Link
                      href={`/profil/${leader.handle}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: 44,
                        margin: '-12px 0',
                        fontWeight: 600,
                        color: 'var(--text-strong)',
                        textDecoration: 'underline',
                        textUnderlineOffset: 3,
                      }}
                    >
                      Cały profil
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
          </section>

          {swiatlo && swiatlo.events.length > 0 ? (
            <section className="rn-sek">
              <h2>Ostatnie światło</h2>
              <ol className="os-sw">
                {swiatlo.events.slice(0, 4).map((e) => {
                  const dni = dniDoDojrzenia(e.maturesAt);
                  const co =
                    e.type === 'ORDER_COMPLETED_RATED'
                      ? 'Ocena po zleceniu'
                      : e.type === 'ANSWER_ACCEPTED'
                        ? 'Uznana odpowiedź'
                        : 'Głos za odpowiedź';
                  return (
                    <li key={e.id}>
                      <Aw
                        name={e.source?.name ?? '?'}
                        size={36}
                        company={e.source?.kind === 'company'}
                        industry={listing.industry.name}
                      />
                      <span className="co">
                        <b>{e.source?.name ?? 'Użytkownik'}</b> · {co}
                        {e.weight < 1 ? ` · waga ×${String(e.weight).replace('.', ',')}` : ''}
                        <small>
                          {e.title ? `${e.title} · ` : ''}
                          {dm(e.createdAt)}
                          {dni ? ` · dojrzewa za ${dni} ${plural(dni, 'dzień', 'dni', 'dni')}` : ''}
                        </small>
                      </span>
                      <span className="pkt">+{e.points}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          <section className="rn-sek">
            <h2>
              Oceny po zleceniach
              <small>
                {leader.reviewCount > 0
                  ? `${String(leader.averageRating).replace('.', ',')} · ${leader.reviewCount} ${plural(leader.reviewCount, 'ocena', 'oceny', 'ocen')}`
                  : 'jeszcze bez ocen'}
              </small>
            </h2>
            {lista.length > 0 ? (
              <>
                {lista.map((r) => (
                  <article className="rn-ocena" key={r.id}>
                    <Aw name={r.companyName} size={40} company industry={listing.industry.name} />
                    <div>
                      <div className="g">
                        <b>{r.companyName}</b>
                        <span className="of-ok" style={{ display: 'inline-flex' }}>
                          <Ico n="star" />
                          {r.rating}/5
                        </span>
                        <span>· {temu(r.publishedAt)}</span>
                      </div>
                      {r.comment ? <p>{r.comment}</p> : null}
                      {r.points ? (
                        <span className="pk">
                          +{r.points} pkt{' '}
                          <small>
                            dla Lidera
                            {r.weight && r.weight < 1
                              ? ` · waga ×${String(r.weight).replace('.', ',')}`
                              : ''}
                          </small>
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
                {/* ADR-010: „N z M” zamiast liczników; pełnej listy ocen na osobnej stronie jeszcze nie ma. */}
                <div className="rn-wiecej">
                  <small>
                    {lista.length} z {leader.reviewCount}
                  </small>
                </div>
              </>
            ) : (
              <Komunikat
                ikona="chat-teardrop-text"
                tytul="Ta usługa nie ma jeszcze ocen"
                opis="Pierwsza ocena pojawi się po zrealizowanym zleceniu — dopiero wtedy Lider dostaje za nią punkty."
              />
            )}
          </section>

          {isOwner ? (
            <section className="rn-sek">
              <Link className="vbtn obrys" href={`/uslugi/${listing.slug}/edytuj`}>
                <Ico n="pencil-simple" />
                Edytuj tę usługę
              </Link>
            </section>
          ) : null}
          <div className="rn-stopka rn-st-szer">
            <Stopka />
          </div>
        </div>
      </div>
    </Rama>
  );
}

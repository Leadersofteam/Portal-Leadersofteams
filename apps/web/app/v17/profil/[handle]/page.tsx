import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense, cache } from 'react';

import { Ico } from '@/components/v17/ico';
import { Komunikat, Sz, SzWiersz } from '@/components/v17/karty';
import { Obserwuj } from '@/components/v17/obserwuj';
import { Rama, Stopka } from '@/components/v17/rama';
import type { Ja } from '@/components/v17/rama';
import { OkladkaProfilu } from '@/components/v17/scena';
import { Udostepnij } from '@/components/v17/udostepnij';
import { Aw, Miernik, Odznaka, Okladka, Schodki, rodzajZBranzy } from '@/components/v17/znaki';
import type { LevelRule } from '@/lib/levels';
import { serverApi, serverApiStatus } from '@/lib/server-api';
import { basePoints, levelsOrFallback, nf, plural, progress } from '@/lib/v17';
import { loadJa, loadMojaDrabinka } from '@/lib/v17-data';

interface SocialProfile {
  user: {
    id: string;
    displayName: string;
    handle: string | null;
    avatarFileId: string | null;
    level: number;
  };
  leaderProfile: { id: string; headline: string } | null;
}
interface LeaderFull {
  profile: {
    id: string;
    headline: string;
    bio: string | null;
    industry: { name: string; slug: string };
    level: number;
    averageRating: number | null;
    reviewCount: number;
    completedOrders: number;
  };
  journey: { joinedAt: string | null; achievements: Array<{ level: number; achievedAt: string }> };
}
interface Review {
  id: string;
  rating: number;
  comment: string | null;
  publishedAt: string;
  orderTitle: string;
  companyName: string;
}
interface Listing {
  id: string;
  slug: string;
  title: string;
  priceFrom: number;
  industry: { name: string; slug: string };
  packages: Array<{ deliveryDays: number }>;
}

const getProfile = cache((handle: string) =>
  serverApiStatus<SocialProfile>(`/profiles/${encodeURIComponent(handle)}`),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const data = (await getProfile(handle)).data;
  if (!data) return { title: 'Profil nie znaleziony' };
  return {
    title: `${data.user.displayName} (@${handle}) | Leaders of Teams`,
    description: data.leaderProfile?.headline ?? `Profil @${handle} w Leaders of Teams.`,
    alternates: { canonical: `/profil/${handle}` },
  };
}

const dm = (iso: string) =>
  new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
const mies = (iso: string) =>
  new Date(iso).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

export default async function ProfilV17({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { status, data } = await getProfile(handle);
  // 404 MUSI zapaść przed jakimkolwiek Suspense/loading — inaczej strona odda 200 (MINY).
  if (status === 404) notFound();
  // API nie odpowiada / 5xx: to NIE jest „brak profilu” — error.tsx pokazuje stan błędu.
  if (!data) throw new Error(`Profil: API zwróciło ${status}`);
  const ja = await loadJa();
  const shell: Ja | null = ja
    ? { name: ja.displayName, level: ja.level, handle: ja.handle, avatarFileId: ja.avatarFileId }
    : null;
  const rama = {
    aktywny: ja?.id === data.user.id ? ('profil' as const) : ('liderzy' as const),
    ja: shell,
  };
  return (
    <Suspense
      fallback={
        // Jak „ładowanie profilu” w makiecie: rama bez „szeroka”.
        <Rama aktywny={rama.aktywny} ja={rama.ja}>
          <SzkieletProfilu />
        </Rama>
      }
    >
      <ProfilTresc data={data} handle={handle} ja={ja} rama={rama} />
    </Suspense>
  );
}

function SzkieletProfilu() {
  return (
    <div role="status" aria-busy="true" aria-label="Wczytywanie profilu">
      <div className="sz" style={{ height: 150, borderRadius: 0 }} />
      <div style={{ padding: '0 20px', marginTop: -48 }}>
        <Sz w="96px" h={96} kolo />
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <Sz w="46%" h={22} />
          <Sz w="30%" m />
          <Sz w="80%" m />
        </div>
      </div>
      <div style={{ padding: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <SzWiersz key={i} />
        ))}
      </div>
    </div>
  );
}

async function ProfilTresc({
  data,
  handle,
  ja,
  rama,
}: {
  data: SocialProfile;
  handle: string;
  ja: Awaited<ReturnType<typeof loadJa>>;
  rama: { aktywny: 'profil' | 'liderzy'; ja: Ja | null };
}) {
  const u = data.user;
  const isSelf = ja?.id === u.id;
  const lid = data.leaderProfile?.id ?? null;
  const [full, rev, list, lv, follow, moja] = await Promise.all([
    lid ? serverApi<LeaderFull>(`/leaders/${lid}`) : null,
    lid ? serverApi<{ reviews: Review[] }>(`/leaders/${lid}/reviews`) : null,
    lid ? serverApi<{ listings: Listing[] }>(`/listings?leaderProfileId=${lid}&limit=6`) : null,
    serverApi<{ levels: LevelRule[] }>('/ladder/levels'),
    ja && !isSelf ? serverApi<{ following: boolean }>(`/users/${u.id}/follow`) : null,
    isSelf ? loadMojaDrabinka() : null,
  ]);
  const rules = levelsOrFallback(lv?.levels);
  const level = full?.profile.level ?? u.level;
  const reviews = rev?.reviews ?? [];
  const src = u.avatarFileId ? `/api/v1/files/${u.avatarFileId}/thumb` : null;
  const rola = full ? full.profile.industry.name : '';
  const bio = full?.profile.bio ?? full?.profile.headline ?? data.leaderProfile?.headline ?? '';
  const prog = moja ? progress(moja.level, moja.razem, rules) : 0;

  const pusty = reviews.length === 0 && level === 0;
  const akcje = (
    <div className="prof-akcje">
      {isSelf ? (
        <Link className="vbtn glowny" href="/panel">
          <Ico n="pencil-simple" />
          Uzupełnij profil
        </Link>
      ) : (
        <>
          <Link className="vbtn glowny" href="/zlecenia/nowe">
            <Ico n="clipboard-text" />
            Zaproponuj zlecenie
          </Link>
          {ja ? (
            <Obserwuj userId={u.id} initiallyFollowing={follow?.following ?? false} />
          ) : (
            <Link className="vbtn obrys" href="/logowanie">
              <Ico n="plus" />
              Obserwuj
            </Link>
          )}
        </>
      )}
      {/* Makieta: w stanie „pusty” (własny, jeszcze bez punktów) jest tylko „Uzupełnij profil”. */}
      {pusty && isSelf ? null : (
        <Udostepnij
          klasa="ikonka"
          href={`/profil/${handle}`}
          tytul={`${u.displayName} — Leaders of Teams`}
        />
      )}
    </div>
  );

  // Nowy człowiek bez ocen: układ „pusty” z makiety (okładka-konstelacja, brak sekcji z danymi).
  if (pusty) {
    return (
      <Rama aktywny={rama.aktywny} ja={rama.ja}>
        <OkladkaProfilu />
        <div className="prof-glowa">
          <Aw name={u.displayName} size={128} src={src} />
          {akcje}
          <h1>
            {u.displayName} <Odznaka level={0} big />
          </h1>
          {rola ? <div className="rola">{rola}</div> : null}
          <p className="bio" style={{ color: 'var(--text-muted)' }}>
            {bio ||
              (isSelf
                ? 'Dodaj dwa zdania o tym, co robisz i dla kogo. Firmy czytają to przed wysłaniem zlecenia.'
                : 'Ta osoba nie dodała jeszcze opisu.')}
          </p>
        </div>
        <section className="sekcja">
          <header>
            <h2>Realizacje</h2>
          </header>
          <Komunikat
            ikona="seal-check"
            tytul="Pierwsza realizacja pojawi się po zleceniu"
            opis="Firma ocenia pracę po jej zakończeniu — dopiero wtedy wpis trafia na profil. Nie da się go dodać samemu."
          >
            <Link className="vbtn glowny" href="/zlecenia">
              Zobacz otwarte zlecenia
            </Link>
          </Komunikat>
        </section>
        <section className="sekcja">
          <header>
            <h2>Odpowiedzi</h2>
          </header>
          <Komunikat
            ikona="chats-circle"
            tytul="Brak uznanych odpowiedzi"
            opis="Odpowiedz na pytanie z twojej branży. Punkt dostaniesz, gdy autor uzna odpowiedź."
          >
            <Link className="vbtn obrys" href="/pytania">
              Pytania czekające na odpowiedź
            </Link>
          </Komunikat>
        </section>
      </Rama>
    );
  }

  const avg = full?.profile.averageRating;
  return (
    <Rama aktywny={rama.aktywny} ja={rama.ja} szeroka>
      <div className="gh">
        <aside className="gh-lewa" aria-label="Lider">
          <div className="gh-aw">
            <Aw name={u.displayName} size={260} ring level={level} progress={prog} src={src} />
          </div>
          <h1>{u.displayName}</h1>
          <div className="gh-poz">
            <Odznaka level={level} big />
          </div>
          {rola ? <div className="rola">{rola}</div> : null}
          {bio ? <p className="bio">{bio}</p> : null}
          {akcje}
          <ul className="gh-liczby">
            {full ? (
              <li>
                <Ico n="seal-check" />
                <b>{full.profile.completedOrders}</b>{' '}
                {plural(full.profile.completedOrders, 'realizacja', 'realizacje', 'realizacji')}
              </li>
            ) : null}
            {avg ? (
              <li>
                <Ico n="star" />
                <b>{avg.toFixed(1).replace('.', ',')}</b> średnia z {full!.profile.reviewCount}{' '}
                {plural(full!.profile.reviewCount, 'oceny', 'ocen', 'ocen')}
              </li>
            ) : null}
            {full?.journey.joinedAt ? (
              <li>
                <Ico n="calendar-blank" />W Portalu od {mies(full.journey.joinedAt)}
              </li>
            ) : null}
          </ul>
          <section className="gh-dr" aria-label="Do następnego szczebla">
            <h2>{moja ? 'Do następnego szczebla' : 'Szczebel w Drabince'}</h2>
            {moja ? (
              <>
                <div className="duza-liczba">
                  <b>{nf(moja.razem)}</b>
                  <span>
                    {moja.next
                      ? `z ${nf(moja.next.pointsRequired)} do „${moja.next.name}”`
                      : 'najwyższy szczebel'}
                  </span>
                </div>
                <Schodki level={moja.level} progress={prog} />
                {moja.next ? (
                  <div className="sciezka">
                    {(
                      [
                        ['Rynek', moja.rynek, moja.czekaRynek],
                        ['Społeczność', moja.spol, moja.czekaSpol],
                      ] as const
                    ).map(([t, v, w]) => {
                      const kreska = Math.round(
                        (moja.next!.pointsRequired * moja.next!.minPathSharePct) / 100,
                      );
                      return (
                        <div key={t}>
                          <div className="wiersz">
                            <span>{t}</span>
                            <b>{nf(v)}</b>
                          </div>
                          <Miernik
                            value={v}
                            max={moja.next!.pointsRequired}
                            color={`var(--level-${Math.max(moja.level, 1)})`}
                            waiting={w}
                            mark={kreska || null}
                          />
                          {kreska ? (
                            v >= kreska ? (
                              <div className="pod ok">
                                <Ico n="check-circle" /> próg ścieżki spełniony
                              </div>
                            ) : (
                              <div className="pod">
                                brakuje {nf(kreska - v)} pkt do progu {moja.next!.minPathSharePct}%
                                ({nf(kreska)})
                              </div>
                            )
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {/* Punkty innych Liderów są prywatne (księga widoczna tylko dla właściciela — PL3): publiczny jest szczebel i oceny. */}
                <Schodki level={level} progress={0} />
                <div className="pod">
                  Publiczny jest szczebel i oceny od firm. Liczba punktów jest prywatna.
                </div>
              </>
            )}
            {level >= 5 ? (
              <div className="krok" style={{ marginTop: 14 }}>
                <Ico n="app-window" />
                <span>
                  <b>Szczebel {level}</b> daje dostęp do LOT App.
                </span>
              </div>
            ) : null}
          </section>
        </aside>

        <div className="gh-prawa">
          <div className="naglowek" style={{ position: 'sticky' }}>
            <nav className="zakladki" data-przesuw aria-label="Sekcje profilu">
              <a href="#o-mnie" aria-current="page">
                Przegląd
              </a>
              <a href="#realizacje">
                Realizacje
                {reviews.length ? (
                  <span className="ile">{full?.profile.reviewCount ?? reviews.length}</span>
                ) : null}
              </a>
              <a href="#oceny">
                Oceny
                {reviews.length ? (
                  <span className="ile">{full?.profile.reviewCount ?? reviews.length}</span>
                ) : null}
              </a>
              {list?.listings.length ? (
                <a href="#uslugi">
                  Usługi<span className="ile">{list.listings.length}</span>
                </a>
              ) : null}
            </nav>
          </div>

          {bio ? (
            <section className="sekcja" id="o-mnie">
              <div className="readme">
                <header>
                  <Ico n="article" />
                  <span>O mnie</span>
                </header>
                <div className="tr">
                  <p>{bio}</p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="sekcja" id="realizacje">
            <header>
              <h2>Realizacje</h2>
            </header>
            {reviews.length === 0 ? (
              <Komunikat
                ikona="seal-check"
                tytul="Brak opublikowanych realizacji"
                opis="Realizacja pojawia się po ocenie Firmy za zakończone zlecenie."
              />
            ) : (
              <div className="przypiete" data-przesuw>
                {reviews.slice(0, 6).map((r, i) => (
                  <div className="real" key={r.id}>
                    <Okladka
                      id={`ok-r-${i}`}
                      rodzaj={rodzajZBranzy(full?.profile.industry.slug)}
                      seed={r.orderTitle.length}
                    />
                    <span className="w">
                      <span className="tyt">{r.orderTitle}</span>
                      <span className="kto">
                        <Aw
                          name={r.companyName}
                          size={22}
                          company
                          industry={full?.profile.industry.name}
                        />
                        {r.companyName}
                      </span>
                      <span className="dno">
                        <span className="ocena">
                          <Ico n="star" />
                          {r.rating.toFixed(1).replace('.', ',')}
                        </span>
                        <span className="pk">+{basePoints(r.rating)} pkt</span>
                        <span>{mies(r.publishedAt)}</span>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="sekcja">
            <header>
              <h2>Oś światła</h2>
              <small>kto dał punkt, za co, ile — od najnowszych (punkty bazowe)</small>
            </header>
            {reviews.length === 0 ? (
              <Komunikat
                ikona="hand-heart"
                tytul="Jeszcze nikt nie dał tu światła"
                opis="Punkty przychodzą od firm, które oceniają zlecenia, i od Liderów, którzy uznają odpowiedzi."
              />
            ) : (
              <>
                <ol className="os-sw">
                  {reviews.slice(0, 6).map((r) => (
                    <li key={r.id}>
                      <Aw
                        name={r.companyName}
                        size={36}
                        company
                        industry={full?.profile.industry.name}
                      />
                      <span className="co">
                        <b>{r.companyName}</b> · Ocena {r.rating}/5
                        <small>
                          {r.orderTitle} · {dm(r.publishedAt)}
                        </small>
                      </span>
                      <span className="pkt">+{basePoints(r.rating)}</span>
                    </li>
                  ))}
                </ol>
                {/* ADR-010: koniec listy mówi, ile widzisz z ilu. M = liczba opublikowanych ocen z API. */}
                <span className="wiecej-link">
                  Pokaż więcej · {Math.min(6, reviews.length)} z{' '}
                  {full?.profile.reviewCount ?? reviews.length}
                </span>
              </>
            )}
          </section>

          {list?.listings.length ? (
            <section className="sekcja" id="uslugi">
              <header>
                <h2>Usługi</h2>
                <small>ceny orientacyjne, wycena po wizji</small>
              </header>
              <div className="uslugi" data-przesuw>
                {list.listings.map((l, i) => (
                  <Link className="kusl" key={l.id} href={`/uslugi/${l.slug}`}>
                    <Okladka
                      id={`ok-k-${i}`}
                      rodzaj={rodzajZBranzy(l.industry.slug)}
                      seed={i + 1}
                    />
                    <span className="w">
                      <span className="tyt">{l.title}</span>
                      {avg ? (
                        <span className="ocena">
                          <Ico n="star" />
                          {avg.toFixed(1).replace('.', ',')}
                          <span>
                            ({full!.profile.reviewCount}{' '}
                            {plural(full!.profile.reviewCount, 'ocena', 'oceny', 'ocen')})
                          </span>
                        </span>
                      ) : null}
                      <span className="dno">
                        <span className="cena">
                          od <b>{nf(l.priceFrom)} zł</b>
                        </span>
                        {l.packages.length ? (
                          <span className="cena">
                            {Math.min(...l.packages.map((p) => p.deliveryDays))}+ dni
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {reviews.some((r) => r.comment) ? (
            <section className="sekcja" id="oceny">
              <header>
                <h2>Ostatnie oceny</h2>
              </header>
              {reviews
                .filter((r) => r.comment)
                .slice(0, 3)
                .map((r) => (
                  <div className="cytat" key={r.id}>
                    <Aw
                      name={r.companyName}
                      size={40}
                      company
                      industry={full?.profile.industry.name}
                    />
                    <div>
                      <q>{r.comment}</q>
                      <div className="kto">
                        <b style={{ color: 'var(--text-strong)', fontWeight: 600 }}>
                          {r.companyName}
                        </b>
                        <span className="gwiazdy" aria-label={`${r.rating} na 5`}>
                          {[...Array(r.rating)].map((_, i) => (
                            <Ico key={i} n="star" />
                          ))}
                        </span>
                        <span>
                          {r.orderTitle} · {dm(r.publishedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </section>
          ) : null}
          <div className="sekcja" style={{ border: 0 }}>
            <Stopka />
          </div>
        </div>
      </div>
    </Rama>
  );
}

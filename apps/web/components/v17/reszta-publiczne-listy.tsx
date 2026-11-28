'use client';

// Listy stron publicznych „Rynek — reszta” (makieta p1b: branże i „Dla firm”). Klienckie tylko dla
// „Pokaż więcej” i zakładki „Zapisz” — pierwsza porcja i tak trafia do HTML z serwera (SEO).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';
import { LEVEL_NAMES } from '@/lib/levels';
import { nf, nf4, plural, temu } from '@/lib/v17';
import { useSession } from '@/lib/use-session';
import type { ListingCardData } from '@/components/ui/listing-card';

import { Ico } from './ico';
import { Ocena, ofertyEtykieta, zl } from './rynek';
import { Aw, Odznaka, Okladka, rodzajRynek } from './znaki';

export function PasekBranz({
  branze,
  baza,
  aktywna,
}: {
  branze: Array<{ id: string; name: string; slug: string }>;
  /** `/zlecenia` albo `/uslugi` */
  baza: string;
  aktywna: string;
}) {
  const ref = useRef<HTMLElement>(null);
  // Aktywna branża bywa daleko w prawo — bez przewinięcia na telefonie nie widać, gdzie się jest.
  useEffect(() => {
    const pasek = ref.current;
    const a = pasek?.querySelector<HTMLElement>('[aria-current]');
    if (!pasek || !a) return;
    // Z prostokątów, nie z offsetLeft: ten bywa liczony już od paska i przesunięcie wychodziło podwójne.
    const odPaska = a.getBoundingClientRect().left - pasek.getBoundingClientRect().left;
    pasek.scrollLeft += odPaska - (pasek.clientWidth - a.offsetWidth) / 2;
  }, [aktywna]);
  return (
    <nav className="filtry" data-przesuw aria-label="Branże" ref={ref}>
      <Link className="filtr" href={baza}>
        Wszystkie branże
      </Link>
      {branze.map((b) => (
        <Link
          key={b.id}
          className="filtr"
          href={`${baza}/branza/${b.slug}`}
          aria-current={b.slug === aktywna ? 'true' : undefined}
        >
          {b.name}
        </Link>
      ))}
    </nav>
  );
}

// ADR-010: dalsza porcja wyłącznie na kliknięcie, a pod przyciskiem zawsze „N z M”.
function useWiecej<T>(
  adres: string,
  klucz: 'orders' | 'listings',
  start: T[],
  kursor: string | null,
  razem: number,
) {
  const [stan, setStan] = useState({ rows: start, kursor, razem });
  const [czeka, setCzeka] = useState(false);
  const [blad, setBlad] = useState(false);
  async function dalej() {
    if (!stan.kursor || czeka) return;
    setCzeka(true);
    setBlad(false);
    try {
      const d = await apiFetch<{ nextCursor: string | null; total?: number } & Record<string, T[]>>(
        `${adres}&cursor=${encodeURIComponent(stan.kursor)}`,
      );
      setStan((s) => ({
        rows: [...s.rows, ...(d[klucz] as T[])],
        kursor: d.nextCursor,
        razem: d.total ?? s.razem,
      }));
    } catch {
      setBlad(true);
    } finally {
      setCzeka(false);
    }
  }
  const stopka = (
    <div className="wiecej">
      {stan.kursor ? (
        <button className="vbtn obrys" type="button" disabled={czeka} onClick={() => void dalej()}>
          Pokaż więcej
        </button>
      ) : null}
      <small className="num">
        {stan.rows.length} z {nf(Math.max(stan.razem, stan.rows.length))}
      </small>
      {blad ? <small role="alert">Nie udało się wczytać. Spróbuj ponownie.</small> : null}
    </div>
  );
  return { rows: stan.rows, stopka };
}

export interface ZlecenieBranzy {
  id: string;
  title: string;
  industry: { name: string };
  budgetMin: number;
  budgetMax: number;
  minLevel: number;
  publishedAt: string | null;
  companyName: string;
  companyVerified?: boolean;
  offersCount?: number;
  /** Liczone na serwerze dla pierwszej porcji: „dziś” z chwili hydracji różniłoby się od HTML z ISR. */
  kiedy?: string;
}

export function ZleceniaBranzy({
  adres,
  start,
  kursor,
  razem,
}: {
  adres: string;
  start: ZlecenieBranzy[];
  kursor: string | null;
  razem: number;
}) {
  const { rows, stopka } = useWiecej(adres, 'orders', start, kursor, razem);
  return (
    <>
      <div className="br-lista">
        {rows.map((z) => {
          const of = z.offersCount ?? 0;
          const kiedy = z.kiedy ?? (z.publishedAt ? temu(z.publishedAt) : '');
          const szczebel = LEVEL_NAMES[z.minLevel - 1];
          return (
            <Link key={z.id} className="zl-w" href={`/zlecenia/${z.id}`}>
              <Aw name={z.companyName} size={40} company industry={z.industry.name} />
              <div style={{ minWidth: 0 }}>
                <div className="zl-kto">
                  <b>{z.companyName}</b>
                  <span className={`zw${z.companyVerified ? '' : ' brak'}`}>
                    <Ico n={z.companyVerified ? 'seal-check' : 'question'} />
                    {z.companyVerified ? 'NIP — suma kontrolna OK' : 'Bez NIP'}
                  </span>
                  {kiedy ? <span>· {kiedy}</span> : null}
                </div>
                <div className="zl-tyt">{z.title}</div>
                <div className="zl-fakty">
                  <b>
                    {nf4(z.budgetMin)}–{zl(z.budgetMax)}
                  </b>
                </div>
                {szczebel ? (
                  <div className="zl-wym">
                    <Ico n="lock-simple" />
                    <span>
                      Oferty od{' '}
                      <b>
                        L{z.minLevel} · {szczebel}
                      </b>
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="zl-of">
                <b className={of ? '' : 'zero'}>{of}</b>
                <span>{ofertyEtykieta(of)}</span>
              </div>
            </Link>
          );
        })}
      </div>
      {stopka}
    </>
  );
}

// Strona jest z ISR (bez cookies), więc zapisane usługi widza dociągamy dopiero w przeglądarce.
function useZapisane() {
  const router = useRouter();
  const { user } = useSession();
  const [zapisane, setZapisane] = useState<Record<string, boolean>>({});
  const [czeka, setCzeka] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void apiFetch<{ listings: Array<{ id: string }> }>('/me/favorites')
      .then((d) =>
        setZapisane((z) => ({ ...Object.fromEntries(d.listings.map((l) => [l.id, true])), ...z })),
      )
      .catch(() => {
        /* bez listy zakładki zostają puste; kliknięcie i tak działa */
      });
  }, [user]);

  async function przelacz(id: string) {
    if (czeka) return;
    setCzeka(id);
    const byla = zapisane[id] ?? false;
    try {
      await apiFetch(`/listings/${id}/favorite`, { method: byla ? 'DELETE' : 'PUT' });
      setZapisane((z) => ({ ...z, [id]: !byla }));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) router.push('/logowanie');
    } finally {
      setCzeka(null);
    }
  }
  return { zapisane, czeka, przelacz };
}

type Zakladki = ReturnType<typeof useZapisane>;

function KartaUslugi({
  u,
  seed,
  dane,
  zakladki,
}: {
  u: ListingCardData;
  seed: number;
  /** Wiersz „zrealizowane · pakiety” — na „Dla firm” makieta go nie ma. */
  dane: boolean;
  zakladki: Zakladki;
}) {
  const href = `/uslugi/${u.slug}`;
  const zapisana = zakladki.zapisane[u.id] ?? false;
  const zr = u.leader.completedOrders;
  const pk = u.packages.length;
  return (
    <article className="uk" style={{ position: 'relative' }}>
      {/* Okładka powtarza link z tytułu — dla klawiatury i czytnika zostaje jeden. */}
      <Link href={href} tabIndex={-1} aria-hidden="true">
        {u.images[0] ? (
          <div className="okl">
            <img
              src={`/api/v1/files/${u.images[0]}/full`}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <Okladka
            rodzaj={rodzajRynek(u.industry.name)}
            seed={seed}
            ikona={false}
            id={`ok-${u.id}`}
          />
        )}
      </Link>
      <button
        className="ikonka"
        type="button"
        aria-pressed={zapisana}
        aria-label={zapisana ? 'Usuń z zapisanych' : 'Zapisz usługę'}
        disabled={zakladki.czeka === u.id}
        onClick={() => void zakladki.przelacz(u.id)}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
        }}
      >
        <Ico n="bookmark-simple" />
      </button>
      <div className="ul">
        <Aw
          name={u.leader.displayName}
          size={28}
          src={u.leader.avatarFileId ? `/api/v1/files/${u.leader.avatarFileId}/thumb` : null}
        />
        <b>{u.leader.displayName}</b>
        <Odznaka level={u.leader.level} />
      </div>
      <Link className="utyt" href={href}>
        {u.title}
      </Link>
      <div className="ud">
        <Ocena srednia={u.leader.averageRating} liczba={u.leader.reviewCount} />
        <span className="cena">
          od <b>{zl(u.priceFrom)}</b>
        </span>
      </div>
      {dane ? (
        <div className="data">
          {zr
            ? `${nf(zr)} ${plural(zr, 'zrealizowane zlecenie', 'zrealizowane zlecenia', 'zrealizowanych zleceń')} · `
            : ''}
          {pk} {plural(pk, 'pakiet', 'pakiety', 'pakietów')}
        </div>
      ) : null}
    </article>
  );
}

export function UslugiBranzy({
  adres,
  start,
  kursor,
  razem,
}: {
  adres: string;
  start: ListingCardData[];
  kursor: string | null;
  razem: number;
}) {
  const { rows, stopka } = useWiecej(adres, 'listings', start, kursor, razem);
  const zakladki = useZapisane();
  return (
    <>
      <div className="rn-siatka">
        {rows.map((u, i) => (
          <KartaUslugi key={u.id} u={u} seed={i + 1} dane zakladki={zakladki} />
        ))}
      </div>
      {stopka}
    </>
  );
}

export function UslugiDlaFirm({ uslugi }: { uslugi: ListingCardData[] }) {
  const zakladki = useZapisane();
  return (
    <div className="rn-siatka" style={{ padding: '6px 0 8px' }}>
      {uslugi.map((u, i) => (
        <KartaUslugi key={u.id} u={u} seed={i + 1} dane={false} zakladki={zakladki} />
      ))}
    </div>
  );
}

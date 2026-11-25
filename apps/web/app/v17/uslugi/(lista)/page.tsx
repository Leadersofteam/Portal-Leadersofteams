import Link from 'next/link';

import { FiltrAuto } from '@/components/v17/filtr-auto';
import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Rama, Stopka } from '@/components/v17/rama';
import { Naglowek, Ocena, zl } from '@/components/v17/rynek';
import { Aw, Odznaka, Okladka, rodzajZBranzy } from '@/components/v17/znaki';
import type { ListingCardData } from '@/components/ui/listing-card';
import { publicApi } from '@/lib/server-api';
import { loadJa } from '@/lib/v17-data';

// Metadane jak na liście ze starego wyglądu (ten sam adres).
export const metadata = {
  title: 'Usługi Liderów — katalog | Leaders of Teams',
  description:
    'Katalog usług Liderów Leaders of Teams: jasny zakres, deklarowane widełki cen i poziom w Drabince zdobyty realną pracą. Wyślij zapytanie i przekształć je w zlecenie.',
};

interface Branza {
  id: string;
  name: string;
  slug: string;
}

const KROK = 8;
const CENA: Array<[string, string, Record<string, string>]> = [
  ['', 'dowolna', {}],
  ['do10', 'do 10 tys. zł', { priceMax: '10000' }],
  ['10-50', '10–50 tys. zł', { priceMin: '10000', priceMax: '50000' }],
  ['50+', 'powyżej 50 tys.', { priceMin: '50000' }],
];
const POZIOM: Array<[string, string]> = [
  ['', 'dowolny'],
  ['2', 'od L2'],
  ['3', 'od L3'],
  ['4', 'od L4'],
];
const SORT: Array<[string, string]> = [
  ['newest', 'Najnowsze'],
  ['price_asc', 'Cena: od najniższej'],
  ['price_desc', 'Cena: od najwyższej'],
];

const pierwszy = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function UslugiV17({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const branzaId = pierwszy(sp.industryId);
  const q = pierwszy(sp.q);
  const tag = pierwszy(sp.tag);
  const cena = CENA.find(([k]) => k === pierwszy(sp.cena)) ?? CENA[0]!;
  const poziom = POZIOM.find(([k]) => k === pierwszy(sp.poziom)) ?? POZIOM[0]!;
  const sort = SORT.find(([k]) => k === pierwszy(sp.sort)) ?? SORT[0]!;
  const pokaz = Math.min(Math.max(Number.parseInt(pierwszy(sp.pokaz), 10) || KROK, KROK), 48);
  const maFiltry = Boolean(branzaId || q || tag || cena[0] || poziom[0]);

  const query = new URLSearchParams({ limit: String(pokaz), sort: sort[0], ...cena[2] });
  if (branzaId) query.set('industryId', branzaId);
  if (q) query.set('q', q);
  if (tag) query.set('tag', tag);
  if (poziom[0]) query.set('minLevel', poziom[0]);

  const ja = await loadJa();
  const [data, branzeData] = await Promise.all([
    // Jak w starym katalogu: publicApi, katalog jest publiczny i bez cookies.
    publicApi<{ listings: ListingCardData[]; nextCursor: string | null }>(
      `/listings?${query.toString()}`,
      0,
    ),
    publicApi<{ industries: Branza[] }>('/industries'),
  ]);
  const branze = branzeData?.industries ?? [];
  const uslugi = data?.listings ?? [];

  const href = (zmiana: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams();
    const biezace: Record<string, string> = {
      industryId: branzaId,
      q,
      tag,
      cena: cena[0],
      poziom: poziom[0],
      sort: sort[0] === 'newest' ? '' : sort[0],
    };
    for (const [k, v] of Object.entries({ ...biezace, ...zmiana })) if (v) p.set(k, v);
    const s = p.toString();
    return `/uslugi${s ? `?${s}` : ''}`;
  };

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
      <Naglowek
        tytul="Usługi"
        meta={
          data
            ? `${uslugi.length}${data.nextCursor ? '+' : ''} ${uslugi.length === 1 ? 'usługa' : 'usług'} · ${sort[0] === 'newest' ? 'najnowsze u góry' : sort[1].toLowerCase()}`
            : ''
        }
        cta={{ href: '/uslugi/nowa', etykieta: 'Zaproponuj usługę' }}
      />
      <nav className="filtry" data-przesuw aria-label="Branża">
        <Link
          className="filtr"
          href={href({ industryId: '' })}
          aria-current={!branzaId ? 'true' : undefined}
        >
          Wszystkie
        </Link>
        {branze.map((b) => (
          <Link
            key={b.id}
            className="filtr"
            href={href({ industryId: b.id })}
            aria-current={b.id === branzaId ? 'true' : undefined}
          >
            {b.name}
          </Link>
        ))}
      </nav>
      <FiltrAuto className="rn-pasek" label="Cena, poziom i kolejność">
        {q ? <input type="hidden" name="q" value={q} /> : null}
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        {branzaId ? <input type="hidden" name="industryId" value={branzaId} /> : null}
        <select className="rn-sel" name="cena" aria-label="Cena" defaultValue={cena[0]}>
          {CENA.map(([k, t]) => (
            <option key={k} value={k}>
              Cena: {t}
            </option>
          ))}
        </select>
        <select
          className="rn-sel"
          name="poziom"
          aria-label="Poziom Lidera"
          defaultValue={poziom[0]}
        >
          {POZIOM.map(([k, t]) => (
            <option key={k} value={k}>
              Poziom Lidera: {t}
            </option>
          ))}
        </select>
        <select className="rn-sel" name="sort" aria-label="Kolejność" defaultValue={sort[0]}>
          {SORT.map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
      </FiltrAuto>
      {tag || q ? (
        <div className="rn-aktywne">
          <span>Filtry:</span>
          {tag ? <span className="t">#{tag}</span> : null}
          {q ? <span className="t">„{q}”</span> : null}
          <Link className="t" href={href({ tag: '', q: '' })}>
            Wyczyść
          </Link>
        </div>
      ) : null}

      {!data ? (
        <Komunikat
          ikona="cloud-slash"
          tytul="Nie udało się wczytać usług"
          opis="To po naszej stronie. Filtry zostały zapamiętane."
        >
          <Link className="vbtn obrys" href={href()}>
            <Ico n="arrow-clockwise" />
            Spróbuj ponownie
          </Link>
        </Komunikat>
      ) : uslugi.length === 0 ? (
        maFiltry ? (
          <Komunikat
            ikona="storefront"
            tytul="Brak usług przy tych filtrach"
            opis="Poluzuj poziom Lidera albo cenę."
          >
            <Link className="vbtn obrys" href="/uslugi">
              Wyczyść filtry
            </Link>
          </Komunikat>
        ) : (
          <Komunikat
            ikona="storefront"
            tytul="Nikt jeszcze nie opublikował usługi"
            opis="Jeśli jesteś Liderem, pokaż firmom, co potrafisz — Twoja usługa będzie tu pierwsza. Firma może też opisać zlecenie i porównać oferty."
          >
            <Link className="vbtn glowny" href="/uslugi/nowa">
              <Ico n="plus" />
              Opublikuj pierwszą usługę
            </Link>
            <Link className="vbtn obrys" href="/zlecenia/nowe">
              Dodaj zlecenie
            </Link>
          </Komunikat>
        )
      ) : (
        <>
          <div className="rn-siatka">
            {uslugi.map((u, i) => (
              <Link key={u.id} className="uk" href={`/uslugi/${u.slug}`}>
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
                  <Okladka rodzaj={rodzajZBranzy(u.industry.name)} seed={i + 1} id={`ok-${u.id}`} />
                )}
                <div className="ul">
                  <Aw
                    name={u.leader.displayName}
                    size={28}
                    src={
                      u.leader.avatarFileId ? `/api/v1/files/${u.leader.avatarFileId}/thumb` : null
                    }
                  />
                  <b>{u.leader.displayName}</b>
                  <Odznaka level={u.leader.level} />
                </div>
                <div className="utyt">{u.title}</div>
                <div className="ud">
                  <Ocena srednia={u.leader.averageRating} liczba={u.leader.reviewCount} />
                  <span className="cena">
                    od <b>{zl(u.priceFrom)}</b>
                  </span>
                </div>
                <div className="data">{u.industry.name}</div>
              </Link>
            ))}
          </div>
          {/* ADR-010: koniec listy mówi, ile widzisz — bez nieskończonego scrolla. „+” = są jeszcze usługi. */}
          <div className="wiecej">
            {data.nextCursor ? (
              <Link className="vbtn obrys" href={href({ pokaz: String(pokaz + KROK) })}>
                Pokaż więcej
              </Link>
            ) : null}
            <small className="num">
              {uslugi.length}
              {data.nextCursor ? '+' : ''}
            </small>
          </div>
        </>
      )}
      <div className="rn-stopka">
        <Stopka />
      </div>
    </Rama>
  );
}

import Link from 'next/link';

import { BranzeLinki } from '@/components/v17/branze-linki';
import { FiltrAuto } from '@/components/v17/filtr-auto';
import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Rama, Stopka } from '@/components/v17/rama';
import { Naglowek, ofertyEtykieta } from '@/components/v17/rynek';
import { Aw } from '@/components/v17/znaki';
import type { LevelRule } from '@/lib/levels';
import { publicApi, serverApi } from '@/lib/server-api';
import { budget, levelsOrFallback, nf, nf4, plural, temu } from '@/lib/v17';
import { loadJa, loadMojaDrabinka } from '@/lib/v17-data';

// Metadane jak na liście ze starego wyglądu (zachowane 1:1 — to ten sam adres).
export const metadata = {
  alternates: { canonical: '/zlecenia' },
  title: 'Zlecenia dla Liderów zespołów — sprzedaż, operacje, projekty | Leaders of Teams',
  description:
    'Aktualne zlecenia B2B od polskich firm: kwota, termin i wymagany poziom w Drabince. Złóż ofertę, zrealizuj i zdobądź ocenę, która buduje Twój status Lidera. Bez prowizji.',
};

interface Zlecenie {
  id: string;
  title: string;
  industry: { id: string; name: string };
  budgetMin: number;
  budgetMax: number;
  minLevel: number;
  publishedAt: string | null;
  companyName: string;
  companyVerified?: boolean;
  offersCount?: number;
}
interface Branza {
  id: string;
  name: string;
  slug: string;
}

const KROK = 8;
// Przedziały budżetu z makiety → parametry API (budgetMin: oferta sięga co najmniej tyle; budgetMax: zaczyna się nie wyżej).
const BUDZET: Array<[string, string, Record<string, string>]> = [
  ['', 'Dowolny', {}],
  ['do5', 'do 5 tys. zł', { budgetMax: '5000' }],
  ['5-20', '5–20 tys. zł', { budgetMin: '5000', budgetMax: '20000' }],
  ['20-60', '20–60 tys. zł', { budgetMin: '20000', budgetMax: '60000' }],
  ['60+', 'powyżej 60 tys. zł', { budgetMin: '60000' }],
];
// Opcje poziomu jak w makiecie; wzajemnie rozłączne przedziały wymaganego poziomu (0 / 1–3 / ≥4).
// Bez wyboru = brak filtra (makieta zaznaczała „Bez wymagań” z góry, ale jej lista pokazywała też zlecenia z wymogiem).
const POZIOM: Array<[string, string, Record<string, string>]> = [
  ['bez', 'Bez wymagań', { maxMinLevel: '0' }],
  ['do3', 'Wymagany poziom do L3', { minLevelFrom: '1', maxMinLevel: '3' }],
  ['l4', 'Wymagany poziom L4 i wyżej', { minLevelFrom: '4' }],
];

const pierwszy = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
const lista = (v: string | string[] | undefined): string[] =>
  (Array.isArray(v) ? v : typeof v === 'string' ? [v] : [])
    .flatMap((x) => x.split(','))
    .filter(Boolean);

export default async function ZleceniaV17({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const branzeWybrane = lista(sp.industryId);
  const q = pierwszy(sp.q);
  const budzet = BUDZET.find(([k]) => k === pierwszy(sp.budzet)) ?? BUDZET[0]!;
  const poziom = POZIOM.find(([k]) => k === pierwszy(sp.poziom)) ?? null;
  const pokaz = Math.min(Math.max(Number.parseInt(pierwszy(sp.pokaz), 10) || KROK, KROK), 48);
  const maFiltry = Boolean(branzeWybrane.length || q || budzet[0] || poziom);

  const query = new URLSearchParams({
    limit: String(pokaz),
    ...budzet[2],
    ...(poziom?.[2] ?? {}),
  });
  if (branzeWybrane.length) query.set('industryIds', branzeWybrane.join(','));
  if (q) query.set('q', q);

  const ja = await loadJa();
  const [data, branzeData, moja, levels] = await Promise.all([
    // Jak w starej liście: publicApi bez cookies, revalidate 0 — świeżo opublikowane zlecenie ma być widoczne od razu.
    publicApi<{
      orders: Zlecenie[];
      nextCursor: string | null;
      total?: number;
      industryCounts?: Record<string, number>;
      budgetCounts?: Record<string, number>;
      levelCounts?: Record<string, number>;
    }>(`/orders?${query.toString()}`, 0),
    publicApi<{ industries: Branza[] }>('/industries'),
    ja ? loadMojaDrabinka() : null,
    ja ? serverApi<{ levels: LevelRule[] }>('/ladder/levels') : null,
  ]);
  const rules = levelsOrFallback(levels?.levels);
  const branze = branzeData?.industries ?? [];
  const zlecenia = data?.orders ?? [];
  const total = data?.total ?? zlecenia.length;
  const liczniki = data?.industryCounts ?? {};
  const licznikiBudzet = data?.budgetCounts ?? {};
  const licznikiPoziom = data?.levelCounts ?? {};

  const href = (zmiana: Record<string, string | string[] | undefined>) => {
    const p = new URLSearchParams();
    const biezace: Record<string, string | string[]> = {
      industryId: branzeWybrane,
      q,
      budzet: budzet[0],
      poziom: poziom?.[0] ?? '',
    };
    for (const [k, v] of Object.entries({ ...biezace, ...zmiana })) {
      for (const x of Array.isArray(v) ? v : v ? [v] : []) p.append(k, x);
    }
    const s = p.toString();
    return `/zlecenia${s ? `?${s}` : ''}`;
  };
  // Chip branży na telefonie: dotknięcie dodaje/zdejmuje branżę (to samo co checkbox na desktopie).
  const przelacz = (id: string) =>
    branzeWybrane.includes(id) ? branzeWybrane.filter((x) => x !== id) : [...branzeWybrane, id];

  // Pola formularza, które nie są polem filtra, a muszą przeżyć wysyłkę.
  const ukryte = q ? <input type="hidden" name="q" value={q} /> : null;
  const aktywneEtykiety = [
    ...branzeWybrane.map((id) => branze.find((b) => b.id === id)?.name),
    budzet[0] ? `budżet ${budzet[1]}` : '',
    poziom ? poziom[1].toLowerCase() : '',
  ].filter(Boolean);

  const filtrBok = (
    <aside className="bok" aria-label="Filtry">
      <FiltrAuto className="rn-filtr" label="Filtry zleceń">
        {ukryte}
        <div>
          <h2>Branża</h2>
          <div className="og">
            {branze.map((b) => (
              <label key={b.id}>
                <input
                  type="checkbox"
                  name="industryId"
                  value={b.id}
                  defaultChecked={branzeWybrane.includes(b.id)}
                />
                {b.name}
                {liczniki[b.id] !== undefined ? <span className="n">{liczniki[b.id]}</span> : null}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h2>Budżet</h2>
          <div className="og">
            {BUDZET.map(([k, t]) => (
              <label key={k}>
                <input type="radio" name="budzet" value={k} defaultChecked={k === budzet[0]} />
                {t}
                {licznikiBudzet[k] !== undefined ? (
                  <span className="n">{licznikiBudzet[k]}</span>
                ) : null}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h2>Poziom oferenta</h2>
          <div className="og">
            {POZIOM.map(([k, t]) => (
              <label key={k}>
                <input type="radio" name="poziom" value={k} defaultChecked={k === poziom?.[0]} />
                {t}
                {licznikiPoziom[k] !== undefined ? (
                  <span className="n">{licznikiPoziom[k]}</span>
                ) : null}
              </label>
            ))}
          </div>
        </div>
        {maFiltry ? (
          <Link className="czysc" href="/zlecenia">
            Wyczyść filtry
          </Link>
        ) : null}
        <p className="rn-uwaga">
          <Ico n="seal-check" />
          <b>Oferta punktów nie daje.</b> Punkty dostaje Lider od firmy, która oceni go po
          zrealizowanym zleceniu — do 100.
        </p>
      </FiltrAuto>
    </aside>
  );

  return (
    <Rama
      aktywny="zlecenia"
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
      boczna={filtrBok}
    >
      <Naglowek
        tytul="Zlecenia"
        meta={
          data
            ? `${nf(total)} ${plural(total, 'otwarte', 'otwarte', 'otwartych')} · najnowsze u góry`
            : ''
        }
        cta={{ href: '/zlecenia/nowe', etykieta: 'Dodaj zlecenie' }}
      />

      <div className="rn-mob">
        <nav className="filtry rn-chipy" data-przesuw aria-label="Branża">
          <Link
            className="filtr"
            href={href({ industryId: [] })}
            aria-current={!branzeWybrane.length ? 'true' : undefined}
          >
            Wszystkie
          </Link>
          {branze.map((b) => (
            <Link
              key={b.id}
              className="filtr"
              href={href({ industryId: przelacz(b.id) })}
              aria-current={branzeWybrane.includes(b.id) ? 'true' : undefined}
            >
              {b.name}
            </Link>
          ))}
        </nav>
        <FiltrAuto className="rn-pasek" label="Budżet i poziom">
          {ukryte}
          {branzeWybrane.map((id) => (
            <input key={id} type="hidden" name="industryId" value={id} />
          ))}
          <select className="rn-sel" name="budzet" aria-label="Budżet" defaultValue={budzet[0]}>
            {BUDZET.map(([k, t]) => (
              <option key={k} value={k}>
                {k ? `Budżet: ${t}` : 'Budżet: dowolny'}
              </option>
            ))}
          </select>
          <select
            className="rn-sel"
            name="poziom"
            aria-label="Poziom oferenta"
            defaultValue={poziom?.[0] ?? ''}
          >
            <option value="">Poziom: dowolny</option>
            <option value="bez">Poziom: bez wymagań</option>
            <option value="do3">Poziom: do L3</option>
            <option value="l4">Poziom: L4 i wyżej</option>
          </select>
        </FiltrAuto>
      </div>

      {aktywneEtykiety.length ? (
        <div className="rn-aktywne">
          <span>Filtry:</span>
          {aktywneEtykiety.map((t) => (
            <span key={t} className="t">
              {t}
            </span>
          ))}
        </div>
      ) : null}

      {!data ? (
        <Komunikat
          ikona="cloud-slash"
          tytul="Nie udało się wczytać zleceń"
          opis="To po naszej stronie. Filtry zostały zapamiętane."
        >
          <Link className="vbtn obrys" href={href({})}>
            <Ico n="arrow-clockwise" />
            Spróbuj ponownie
          </Link>
        </Komunikat>
      ) : zlecenia.length === 0 ? (
        maFiltry ? (
          <Komunikat
            ikona="magnifying-glass"
            tytul="Nic nie pasuje do tych filtrów"
            opis="Poluzuj budżet albo zostaw sam wybór branży."
          >
            <Link className="vbtn obrys" href="/zlecenia">
              Wyczyść filtry
            </Link>
          </Komunikat>
        ) : (
          // Prawdziwych zleceń prawie nie ma — pusty katalog ma podpowiedzieć następny ruch, nie kończyć na „brak”.
          <Komunikat
            ikona="clipboard-text"
            tytul="Nikt jeszcze nie dodał zlecenia"
            opis="Opisz zlecenie — Liderzy z branży złożą oferty, a Ty porównasz je obok siebie. Jeśli jesteś Liderem, zacznij od usługi: firmy zobaczą ją w katalogu."
          >
            <Link className="vbtn glowny" href="/zlecenia/nowe">
              <Ico n="plus" />
              Dodaj pierwsze zlecenie
            </Link>
            <Link className="vbtn obrys" href="/uslugi/nowa">
              Zaproponuj usługę
            </Link>
          </Komunikat>
        )
      ) : (
        <>
          {zlecenia.map((z) => {
            const reguly = z.minLevel > 0 ? rules[z.minLevel - 1] : undefined;
            const za =
              moja && reguly && z.minLevel > moja.level ? reguly.pointsRequired - moja.razem : 0;
            const of = z.offersCount ?? 0;
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
                    {z.publishedAt ? <span>· {temu(z.publishedAt)}</span> : null}
                  </div>
                  <div className="zl-tyt">{z.title}</div>
                  <div className="zl-fakty">
                    <b>{budget(z.budgetMin, z.budgetMax, nf4)}</b>
                    <span>{z.industry.name}</span>
                  </div>
                  {reguly ? (
                    <div className={`zl-wym${za > 0 ? ' za-wysoko' : ''}`}>
                      <Ico n="lock-simple" />
                      <span>
                        Oferty od{' '}
                        <b>
                          L{z.minLevel} · {reguly.name}
                        </b>
                        {za > 0 ? ` — brakuje ${nf(za)} pkt` : ''}
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
          {/* ADR-010: koniec listy mówi, ile widzisz z ilu — bez nieskończonego scrolla. */}
          <div className="wiecej">
            {data.nextCursor ? (
              <Link className="vbtn obrys" href={href({ pokaz: String(pokaz + KROK) })}>
                Pokaż więcej
              </Link>
            ) : null}
            <small className="num">
              {zlecenia.length} z {nf(total)}
            </small>
          </div>
        </>
      )}
      <BranzeLinki branze={branze} base="/zlecenia" />
      <div className="rn-stopka">
        <Stopka />
      </div>
    </Rama>
  );
}

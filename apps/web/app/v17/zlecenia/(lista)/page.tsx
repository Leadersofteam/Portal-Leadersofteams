import Link from 'next/link';

import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { FiltrAuto } from '@/components/v17/filtr-auto';
import { Rama } from '@/components/v17/rama';
import { Naglowek, ofertyEtykieta } from '@/components/v17/rynek';
import { Stopka } from '@/components/v17/rama';
import { Aw } from '@/components/v17/znaki';
import type { LevelRule } from '@/lib/levels';
import { publicApi, serverApi } from '@/lib/server-api';
import { budget, levelsOrFallback, nf, timeAgo } from '@/lib/v17';
import { loadJa, loadMojaDrabinka } from '@/lib/v17-data';

// Metadane jak na liście z starego wyglądu (zachowane 1:1 — to ten sam adres).
export const metadata = {
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
// API filtruje `maxMinLevel` (zlecenia, których wymóg nie przekracza); przedziału „L4 i wyżej” nie ma — patrz raport.
const POZIOM: Array<[string, string, Record<string, string>]> = [
  ['', 'Dowolny', {}],
  ['bez', 'Bez wymagań', { maxMinLevel: '0' }],
  ['do3', 'Wymagany poziom do L3', { maxMinLevel: '3' }],
];

// „3 dni” → „3 dni temu”, ale „wczoraj”/„teraz”/data zostają bez „temu”.
const temu = (iso: string) => {
  const t = timeAgo(iso);
  return /(min|godz\.|dni)$/.test(t) ? `${t} temu` : t;
};

const pierwszy = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function ZleceniaV17({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const branzaId = pierwszy(sp.industryId);
  const q = pierwszy(sp.q);
  const budzet = BUDZET.find(([k]) => k === pierwszy(sp.budzet)) ?? BUDZET[0]!;
  const poziom = POZIOM.find(([k]) => k === pierwszy(sp.poziom)) ?? POZIOM[0]!;
  const pokaz = Math.min(Math.max(Number.parseInt(pierwszy(sp.pokaz), 10) || KROK, KROK), 48);
  const maFiltry = Boolean(branzaId || q || budzet[0] || poziom[0]);

  const query = new URLSearchParams({ limit: String(pokaz), ...budzet[2], ...poziom[2] });
  if (branzaId) query.set('industryId', branzaId);
  if (q) query.set('q', q);

  const ja = await loadJa();
  const [data, branzeData, moja, levels] = await Promise.all([
    // Jak w starej liście: publicApi bez cookies, revalidate 0 — świeżo opublikowane zlecenie ma być widoczne od razu.
    publicApi<{ orders: Zlecenie[]; nextCursor: string | null }>(`/orders?${query.toString()}`, 0),
    publicApi<{ industries: Branza[] }>('/industries'),
    ja ? loadMojaDrabinka() : null,
    ja ? serverApi<{ levels: LevelRule[] }>('/ladder/levels') : null,
  ]);
  const rules = levelsOrFallback(levels?.levels);
  const branze = branzeData?.industries ?? [];
  const zlecenia = data?.orders ?? [];

  const href = (zmiana: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const biezace: Record<string, string> = {
      industryId: branzaId,
      q,
      budzet: budzet[0],
      poziom: poziom[0],
    };
    for (const [k, v] of Object.entries({ ...biezace, ...zmiana })) if (v) p.set(k, v);
    const s = p.toString();
    return `/zlecenia${s ? `?${s}` : ''}`;
  };

  // Pola formularza, które nie są polem filtra, a muszą przeżyć wysyłkę.
  const ukryte = q ? <input type="hidden" name="q" value={q} /> : null;
  const aktywneEtykiety = [
    branze.find((b) => b.id === branzaId)?.name,
    budzet[0] ? `budżet ${budzet[1]}` : '',
    poziom[0] ? poziom[1].toLowerCase() : '',
  ].filter(Boolean);

  const filtrBok = (
    <aside className="bok" aria-label="Filtry">
      <FiltrAuto className="rn-filtr" label="Filtry zleceń">
        {ukryte}
        <div>
          <h2>Branża</h2>
          <div className="og">
            <label>
              <input type="radio" name="industryId" value="" defaultChecked={!branzaId} />
              Wszystkie
            </label>
            {branze.map((b) => (
              <label key={b.id}>
                <input
                  type="radio"
                  name="industryId"
                  value={b.id}
                  defaultChecked={b.id === branzaId}
                />
                {b.name}
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
              </label>
            ))}
          </div>
        </div>
        <div>
          <h2>Poziom oferenta</h2>
          <div className="og">
            {POZIOM.map(([k, t]) => (
              <label key={k}>
                <input type="radio" name="poziom" value={k} defaultChecked={k === poziom[0]} />
                {t}
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
            ? `${zlecenia.length}${data.nextCursor ? '+' : ''} ${zlecenia.length === 1 ? 'otwarte' : 'otwartych'} · najnowsze u góry`
            : ''
        }
        cta={{ href: '/zlecenia/nowe', etykieta: 'Dodaj zlecenie' }}
      />

      <div className="rn-mob">
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
        <FiltrAuto className="rn-pasek" label="Budżet i poziom">
          {ukryte}
          {branzaId ? <input type="hidden" name="industryId" value={branzaId} /> : null}
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
            defaultValue={poziom[0]}
          >
            {POZIOM.map(([k, t]) => (
              <option key={k} value={k}>
                {k
                  ? `Poziom: ${t.replace('Wymagany poziom ', '').replace('Bez wymagań', 'bez wymagań')}`
                  : 'Poziom: dowolny'}
              </option>
            ))}
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
                      {z.companyVerified ? 'Zweryfikowana' : 'Bez NIP'}
                    </span>
                    {z.publishedAt ? <span>· {temu(z.publishedAt)}</span> : null}
                  </div>
                  <div className="zl-tyt">{z.title}</div>
                  <div className="zl-fakty">
                    <b>{budget(z.budgetMin, z.budgetMax)}</b>
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
          {/* ADR-010: koniec listy mówi, ile widzisz — bez nieskończonego scrolla. „+” = są jeszcze zlecenia. */}
          <div className="wiecej">
            {data.nextCursor ? (
              <Link className="vbtn obrys" href={href({ pokaz: String(pokaz + KROK) })}>
                Pokaż więcej
              </Link>
            ) : null}
            <small className="num">
              {zlecenia.length}
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

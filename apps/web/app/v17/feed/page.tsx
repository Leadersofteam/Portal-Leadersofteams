import Link from 'next/link';

import { Ico } from '@/components/v17/ico';
import {
  KartaDrabinki,
  KartaGoscia,
  KartaTematow,
  KartaZlecen,
  Komunikat,
} from '@/components/v17/karty';
import { Kompozytor } from '@/components/v17/kompozytor';
import { Rama, Stopka } from '@/components/v17/rama';
import { WierszStrumienia } from '@/components/v17/wpisy';
import { Aw, Miernik } from '@/components/v17/znaki';
import type { LevelRule } from '@/lib/levels';
import { serverApi } from '@/lib/server-api';
import { nf } from '@/lib/v17';
import { levelsOrFallback, progress } from '@/lib/v17';
import { FILTRY, loadJa, loadMojaDrabinka, loadStrumien } from '@/lib/v17-data';
import type { Filtr } from '@/lib/v17-data';

export const metadata = { title: 'Strumień — Portal Liderów' };

const KROK = 8;

export default async function FeedV17({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filtr = (FILTRY.find(([k]) => k === sp.filtr)?.[0] ?? 'wszystko') as Filtr;
  const pokaz = Math.min(Math.max(Number.parseInt(String(sp.pokaz ?? KROK), 10) || KROK, KROK), 48);

  const ja = await loadJa();
  // „Moja branża” wymaga profilu Lidera (branża z profilu). Bez niego zakładka prowadzi do pustego stanu.
  const mp = ja ? await serverApi<Record<string, unknown>>('/me/leader-profile') : null;
  const profile = (mp && ((mp as { profile?: unknown }).profile ?? mp)) as {
    industryId?: string;
    industry?: { slug: string };
  } | null;
  const branza =
    profile?.industryId && profile.industry
      ? { id: profile.industryId, slug: profile.industry.slug }
      : null;

  const [moja, levels, strumien, tematy, zlecenia] = await Promise.all([
    ja ? loadMojaDrabinka() : null,
    serverApi<{ levels: LevelRule[] }>('/ladder/levels'),
    loadStrumien(filtr, pokaz, branza),
    serverApi<{ topics: Array<{ name: string; slug: string }> }>('/topics/popular'),
    serverApi<{
      orders: Array<{
        id: string;
        title: string;
        companyName: string;
        industry: { name: string };
        budgetMin: number;
        budgetMax: number;
        offersCount?: number;
      }>;
    }>(`/orders?limit=3${branza ? `&industryId=${encodeURIComponent(branza.id)}` : ''}`),
  ]);
  const rules = levelsOrFallback(levels?.levels.map((l) => ({ ...l, level: l.level })));
  const avatarSrc = ja?.avatarFileId ? `/api/v1/files/${ja.avatarFileId}/thumb` : null;
  const href = (f: Filtr, p?: number) =>
    `/feed?${new URLSearchParams({ ...(f !== 'wszystko' ? { filtr: f } : {}), ...(p ? { pokaz: String(p) } : {}) }).toString()}`.replace(
      /\?$/,
      '',
    );

  // Pasek Drabinki (telefon): postęp w oknie bieżącego szczebla — jak w makiecie (70/800).
  const odProgu = moja ? (moja.level ? (rules[moja.level - 1]?.pointsRequired ?? 0) : 0) : 0;
  const okno = moja?.next ? moja.next.pointsRequired - odProgu : 0;

  const wszystkieBledy = strumien.zrodelBledow > 0 && strumien.wpisy.length === 0;
  const bok = (
    <aside className="bok">
      <div className="bok-lepki">
        {moja && ja ? (
          <KartaDrabinki
            moja={moja}
            name={ja.displayName}
            avatarFileId={ja.avatarFileId}
            rules={rules}
          />
        ) : (
          <KartaGoscia />
        )}
        <KartaZlecen
          zlecenia={(zlecenia?.orders ?? []).map((o) => ({
            id: o.id,
            title: o.title,
            company: o.companyName,
            industry: o.industry.name,
            min: o.budgetMin,
            max: o.budgetMax,
            offers: o.offersCount ?? 0,
          }))}
        />
        <KartaTematow tematy={(tematy?.topics ?? []).slice(0, 7)} />
        <Stopka />
      </div>
    </aside>
  );

  return (
    <Rama
      aktywny="feed"
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
      boczna={bok}
    >
      <div className="naglowek">
        <h1>Strumień</h1>
      </div>
      {moja && ja ? (
        <Link className="pasek-drabinki" href="/drabinka">
          <Aw
            name={ja.displayName}
            size={40}
            ring
            level={moja.level}
            progress={progress(moja.level, moja.razem, rules)}
            src={avatarSrc}
          />
          <span className="t">
            <b>
              {moja.levelName ?? 'Nowy w Portalu'} · {nf(moja.razem)} pkt
            </b>
            <small>
              {moja.next
                ? `${nf(moja.next.missingPoints)} do „${moja.next.name}”`
                : 'Najwyższy szczebel'}
              {moja.czekaRynek + moja.czekaSpol
                ? ` · +${nf(moja.czekaRynek + moja.czekaSpol)} dojrzewa`
                : ''}
            </small>
            {okno > 0 ? (
              <Miernik
                value={moja.razem - odProgu}
                max={okno}
                color={`var(--level-${Math.max(moja.level, 1)})`}
                waiting={moja.czekaRynek + moja.czekaSpol}
              />
            ) : null}
          </span>
          <Ico n="caret-right" />
        </Link>
      ) : null}
      {ja ? <Kompozytor name={ja.displayName} avatarSrc={avatarSrc} /> : null}
      <nav className="filtry" data-przesuw aria-label="Filtr strumienia">
        {FILTRY.map(([k, t]) => (
          <Link
            key={k}
            className="filtr"
            href={href(k)}
            aria-current={k === filtr ? 'true' : undefined}
          >
            {t}
          </Link>
        ))}
      </nav>

      {wszystkieBledy ? (
        <Komunikat
          ikona="cloud-slash"
          tytul="Nie udało się wczytać strumienia"
          opis="To po naszej stronie. Twoje wpisy są bezpieczne."
        >
          <Link className="vbtn glowny" href={href(filtr, pokaz)}>
            <Ico n="arrow-clockwise" />
            Spróbuj ponownie
          </Link>
        </Komunikat>
      ) : strumien.wpisy.length === 0 ? (
        <Komunikat
          ikona="sparkle"
          tytul="Tu pojawią się zlecenia, pytania i realizacje"
          opis={
            filtr === 'moja' && !branza
              ? '„Moja branża” działa po założeniu profilu Lidera z wybraną branżą.'
              : 'Strumień pokaże wpisy od najnowszych, bez algorytmu.'
          }
        >
          <Link className="vbtn glowny" href="/zlecenia">
            Zobacz zlecenia
          </Link>
          <Link className="vbtn obrys" href="/pytania">
            Zadaj pierwsze pytanie
          </Link>
        </Komunikat>
      ) : (
        <>
          {strumien.wpisy.map((w, i) => (
            <WierszStrumienia key={`${w.k}-${w.id}`} w={w} idx={i} />
          ))}
          {strumien.zrodelBledow > 0 ? (
            <p className="wiecej" role="status">
              <small>Część źródeł nie odpowiedziała — lista może być niepełna.</small>
            </p>
          ) : null}
          <div className="wiecej">
            {strumien.mozeWiecej ? (
              <Link className="vbtn obrys" href={href(filtr, pokaz + KROK)}>
                Pokaż więcej
              </Link>
            ) : null}
            {/* ADR-010: koniec listy mówi, ile widzisz — bez nieskończonego scrolla. „+” = są jeszcze wpisy poza oknem. */}
            <small className="num">
              {strumien.wpisy.length} z {strumien.razem}
              {strumien.mozeWiecej && strumien.razem <= strumien.wpisy.length ? '+' : ''}
            </small>
          </div>
        </>
      )}
      <Link className="fab" href="/zlecenia/nowe" aria-label="Utwórz wpis">
        <Ico n="plus" />
      </Link>
    </Rama>
  );
}

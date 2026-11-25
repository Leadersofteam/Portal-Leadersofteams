import Link from 'next/link';

import { Ico } from '@/components/v17/ico';
import type { IcoName } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Rama, Stopka } from '@/components/v17/rama';
import { Scena } from '@/components/v17/scena';
import { Aw, Miernik, Odznaka } from '@/components/v17/znaki';
import { FIRST_POINT } from '@/lib/levels';
import type { LevelRule } from '@/lib/levels';
import { serverApi } from '@/lib/server-api';
import { basePoints, levelsOrFallback, nf, plural, progress } from '@/lib/v17';
import { dniDoDojrzenia, loadJa, loadMojaDrabinka, loadSwiatlo } from '@/lib/v17-data';

export const metadata = {
  title: 'Drabinka Lidera — zasady punktacji — Leaders of Teams',
  description:
    'Jawne zasady awansu: punkty wyłącznie za ocenione zlecenia i uznane odpowiedzi. Zero punktów za zapraszanie i rekrutację.',
  alternates: { canonical: '/drabinka' },
};

const NIE_LICZY: Array<[IcoName, string]> = [
  ['user-plus', 'Zaproszenia i polecenia'],
  ['sign-in', 'Logowanie i dni aktywności'],
  ['note-pencil', 'Wpisy i komentarze'],
  ['heart', 'Reakcje'],
  ['eye', 'Wyświetlenia'],
  ['users', 'Obserwujący'],
  ['magnifying-glass', 'Wyszukiwanie'],
];

export default async function DrabinkaV17() {
  const [ja, lv] = await Promise.all([
    loadJa(),
    serverApi<{ levels: LevelRule[] }>('/ladder/levels'),
  ]);
  // Źródłem progów jest API; lib/levels (lustro rules.ts) to zapas, gdy API milczy.
  const rules = levelsOrFallback(lv?.levels);
  const moja = ja ? await loadMojaDrabinka() : null;
  // Liczniki do wezwań („N pytań czeka”): z publicznych list; „+” gdy jest więcej niż okno 50.
  const [otwarte, zlecenia] = await Promise.all([
    moja
      ? serverApi<{ threads: unknown[]; nextCursor: string | null }>(
          '/threads?status=OPEN&limit=50',
        )
      : null,
    moja ? serverApi<{ orders: unknown[]; nextCursor: string | null }>('/orders?limit=50') : null,
  ]);
  const ile = (r: { nextCursor: string | null } | null, n: number | undefined) =>
    n === undefined ? null : `${n}${r?.nextCursor ? '+' : ''}`;
  const nPytan = ile(otwarte, otwarte?.threads.length);
  const nZlecen = ile(zlecenia, zlecenia?.orders.length);
  const shell = {
    name: ja?.displayName ?? '',
    level: ja?.level ?? 0,
    handle: ja?.handle ?? null,
    avatarFileId: ja?.avatarFileId ?? null,
  };

  if (ja && !moja) {
    return (
      <Rama aktywny="drabinka" ja={shell} szeroka>
        <div className="naglowek">
          <h1>Drabinka Lidera</h1>
        </div>
        <Komunikat
          ikona="cloud-slash"
          tytul="Nie udało się wczytać Drabinki"
          opis="To po naszej stronie. Twoje punkty i wpisy są bezpieczne."
        >
          <Link className="vbtn glowny" href="/drabinka">
            <Ico n="arrow-clockwise" />
            Spróbuj ponownie
          </Link>
          <Link className="vbtn obrys" href="/feed">
            Wróć do strumienia
          </Link>
        </Komunikat>
      </Rama>
    );
  }

  const level = moja?.level ?? 0;
  const pkt = moja?.razem ?? 0;
  const czeka = (moja?.czekaRynek ?? 0) + (moja?.czekaSpol ?? 0);
  const next =
    moja?.next ??
    (level === 0
      ? {
          level: 1,
          name: rules[0]!.name,
          pointsRequired: rules[0]!.pointsRequired,
          missingPoints: rules[0]!.pointsRequired - pkt,
          minPathSharePct: 0,
        }
      : null);
  const odProgu = level ? rules[level - 1]!.pointsRequired : 0;
  const okno = next ? next.pointsRequired - odProgu : 1;
  const c = `var(--level-${Math.max(level, 1)})`;
  const kreska =
    next && next.minPathSharePct
      ? Math.round((next.pointsRequired * next.minPathSharePct) / 100)
      : 0;
  const brakSpol = Math.max(0, kreska - (moja?.spol ?? 0));
  // Publiczna księga (punkty po wagach, ze źródłami po imieniu) — ta sama, którą widzą inni na profilu.
  const ksiega = ja?.handle ? await loadSwiatlo(ja.handle, 12) : null;
  const swiatlo = ksiega?.events ?? [];
  const tydzien = swiatlo
    .filter(
      (e) =>
        e.path === 'spolecznosc' && Date.now() - new Date(e.createdAt).getTime() < 7 * 86_400_000,
    )
    .reduce((sum, e) => sum + e.points, 0);

  return (
    <Rama aktywny="drabinka" ja={ja ? shell : null} szeroka>
      <section className="dr-hero">
        <div>
          <div className="etk">Drabinka Lidera</div>
          <h1>
            Twój punkt nigdy <em>nie świeci sam.</em>
          </h1>
          <p>
            Siedem szczebli. Punkty daje ci wyłącznie drugi człowiek — firma, która oceniła
            zlecenie, albo Lider, który uznał twoją odpowiedź.
          </p>
          {ja ? (
            <div className="dr-ja">
              <Aw
                name={ja.displayName}
                size={64}
                ring
                level={level}
                progress={progress(level, pkt, rules)}
                src={ja.avatarFileId ? `/api/v1/files/${ja.avatarFileId}/thumb` : null}
              />
              <div className="t">
                <div className="r">
                  <b>{nf(pkt)} pkt</b>
                  {next ? (
                    <span>
                      {nf(next.missingPoints)} do „{next.name}”
                    </span>
                  ) : (
                    <span>Najwyższy szczebel</span>
                  )}
                </div>
                <Miernik value={pkt - odProgu} max={okno} color={c} waiting={czeka} />
                <div className="pod">
                  {level ? <Odznaka level={level} /> : <span>Nowy w Portalu</span>}
                  {czeka ? (
                    <span className="dojrzewa">
                      <Ico n="hourglass-medium" />+{nf(czeka)} dojrzewa
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="dr-ja">
              <div className="t">
                <div className="pod">
                  <Link className="vbtn glowny" href="/rejestracja">
                    Załóż konto i zacznij od szczebla 1
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
        <Scena level={level} rules={rules} />
      </section>

      <section className="sekcja">
        <header>
          <h2>Siedem szczebli</h2>
          <small>od szczebla 4 każda ścieżka musi dać min. 20% progu</small>
        </header>
        <ol className="stopnie" data-przesuw style={{ listStyle: 'none', margin: 0 }}>
          {rules.map((s, i) => {
            const ma = s.level <= level;
            const teraz = s.level === level;
            const nast = s.level === level + 1;
            const daje = s.unlocksTeamCreation ? (
              <span className="daje">
                <Ico n="users-three" />
                Własny zespół
              </span>
            ) : s.unlocksAppAccess && !rules[i - 1]?.unlocksAppAccess ? (
              <span className="daje">
                <Ico n="app-window" />
                Dostęp do LOT App
              </span>
            ) : null;
            const stan = ma ? (
              teraz ? (
                <>
                  <Ico n="map-pin" />
                  Tu jesteś
                </>
              ) : (
                <>
                  <Ico n="check-circle" />
                  Zdobyty
                </>
              )
            ) : nast && ja ? (
              `brakuje ${nf(s.pointsRequired - pkt)}`
            ) : s.minPathSharePct ? (
              `2 ścieżki × min. ${nf(Math.round((s.pointsRequired * s.minPathSharePct) / 100))}`
            ) : (
              ''
            );
            return (
              <li
                key={s.level}
                className={`stopien${ma ? ' ma' : ''}${teraz ? ' teraz' : ''}${s.level === 7 ? ' siodmy' : ''}`}
                style={{ '--i': i, '--c': `var(--level-${s.level})` } as React.CSSProperties}
              >
                <span className="nr">{s.level}</span>
                <span className="naz">{s.name}</span>
                <span className="pr num">{nf(s.pointsRequired)} pkt</span>
                {daje}
                <span className="stan">{stan}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {moja && next && level >= 1 ? (
        <section className="sekcja">
          <header>
            <h2>Następny: {next.name}</h2>
            <small className="num">{nf(next.pointsRequired)} pkt</small>
          </header>
          <div className="wymogi">
            <div className="wymog">
              <Ico n="circle-dashed" />
              <span className="co">Łącznie {nf(next.pointsRequired)} pkt</span>
              <span className="ile">
                <b>{nf(pkt)}</b> / {nf(next.pointsRequired)}
              </span>
              <Miernik
                value={pkt}
                max={next.pointsRequired}
                color={`var(--level-${Math.min(level + 1, 7)})`}
                waiting={czeka}
              />
            </div>
            {kreska ? (
              <>
                {(
                  [
                    ['Rynek', moja.rynek, moja.czekaRynek],
                    ['Społeczność', moja.spol, moja.czekaSpol],
                  ] as const
                ).map(([t, v, w]) => (
                  <div key={t} className={`wymog${v >= kreska ? ' ok' : ''}`}>
                    <Ico n={v >= kreska ? 'check-circle' : 'circle-dashed'} />
                    <span className="co">
                      {t} — min. {nf(kreska)} pkt
                    </span>
                    <span className="ile">
                      <b>{nf(v)}</b> / {nf(kreska)}
                    </span>
                    <Miernik
                      value={Math.min(v, kreska)}
                      max={kreska}
                      color={
                        v >= kreska ? 'var(--success)' : `var(--level-${Math.min(level + 1, 7)})`
                      }
                      waiting={v >= kreska ? 0 : w}
                    />
                  </div>
                ))}
              </>
            ) : null}
          </div>
          <div className="drogi">
            {brakSpol > 0 ? (
              <div className="droga">
                <span className="x">
                  {Math.ceil(brakSpol / FIRST_POINT.answerAcceptedPoints)}{' '}
                  {plural(
                    Math.ceil(brakSpol / FIRST_POINT.answerAcceptedPoints),
                    'uznana odpowiedź',
                    'uznane odpowiedzi',
                    'uznanych odpowiedzi',
                  )}
                  <span>
                    +
                    {nf(
                      Math.ceil(brakSpol / FIRST_POINT.answerAcceptedPoints) *
                        FIRST_POINT.answerAcceptedPoints,
                    )}{' '}
                    pkt
                  </span>
                </span>
                <p>
                  Domykają próg społeczności. Limit: {FIRST_POINT.communityWeeklyCap} pkt na{' '}
                  {FIRST_POINT.maturationDays} dni — w tym tygodniu masz {nf(tydzien)} z{' '}
                  {FIRST_POINT.communityWeeklyCap}.
                </p>
                <Link href="/pytania">
                  {nPytan && nPytan !== '0'
                    ? `${nPytan} ${plural(Number.parseInt(nPytan, 10), 'pytanie czeka', 'pytania czekają', 'pytań czeka')} na odpowiedź`
                    : 'Pytania czekające na odpowiedź'}{' '}
                  <Ico n="arrow-right" />
                </Link>
              </div>
            ) : null}
            <div className="droga">
              <span className="x">
                Zlecenie z oceną 5/5<span>+{FIRST_POINT.reviewTopPoints} pkt</span>
              </span>
              <p>
                Każda nowa firma liczy się w pełni. Kolejne oceny od tej samej firmy w roku: ×0,5,
                ×0,25… min. ×0,1.
              </p>
              <Link href="/zlecenia">
                {nZlecen && nZlecen !== '0'
                  ? `${nZlecen} ${plural(Number.parseInt(nZlecen, 10), 'otwarte zlecenie', 'otwarte zlecenia', 'otwartych zleceń')}`
                  : 'Otwarte zlecenia'}{' '}
                <Ico n="arrow-right" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <div className="dwie">
        <section className="sekcja">
          <header>
            <h2>Kto dał ci światło</h2>
            {ja && swiatlo.length ? (
              <small>
                {Math.min(6, swiatlo.length)} z {ksiega?.total ?? swiatlo.length}
              </small>
            ) : null}
          </header>
          {!ja ? (
            <Komunikat
              ikona="hand-heart"
              tytul="Tu zobaczysz, kto dał ci światło"
              opis="Po zalogowaniu: lista ocen i uznanych odpowiedzi — kto, za co i ile."
            >
              <Link className="vbtn glowny" href="/logowanie">
                Zaloguj się
              </Link>
            </Komunikat>
          ) : swiatlo.length === 0 ? (
            <Komunikat
              ikona="hand-heart"
              tytul="Jeszcze nikt nie dał ci światła"
              opis="Pierwsze punkty przyjdą od firmy, która oceni twoje zlecenie, albo od Lidera, który uzna twoją odpowiedź."
            >
              <Link className="vbtn glowny" href="/pytania">
                Pytania czekające na odpowiedź
              </Link>
            </Komunikat>
          ) : (
            <ol className="os">
              {swiatlo.slice(0, 6).map((e) => {
                const dojrzewa = e.status === 'PENDING';
                const dni = dniDoDojrzenia(e.maturesAt);
                const d = new Date(e.createdAt).toLocaleDateString('pl-PL', {
                  day: '2-digit',
                  month: '2-digit',
                });
                const co =
                  e.type === 'ORDER_COMPLETED_RATED'
                    ? 'Ocena po zleceniu'
                    : e.type === 'ANSWER_ACCEPTED'
                      ? 'Uznała twoją odpowiedź'
                      : 'Głos za odpowiedź';
                return (
                  <li key={e.id} className={dojrzewa ? 'czeka' : ''}>
                    <Aw
                      name={e.source?.name ?? '?'}
                      size={40}
                      company={e.source?.kind === 'company'}
                    />
                    <span className="co">
                      <b>{e.source?.name ?? 'Użytkownik'}</b> · {co}
                      {e.weight < 1 ? ` · waga ×${String(e.weight).replace('.', ',')}` : ''}{' '}
                      {e.title ? (
                        <span style={{ color: 'var(--text-muted)' }}>„{e.title}”</span>
                      ) : null}
                      <small>
                        {d} · {e.path === 'rynek' ? 'rynek' : 'społeczność'}
                        {dojrzewa && dni ? (
                          <>
                            {' '}
                            ·{' '}
                            <span className="dojrzewa">
                              <Ico n="hourglass-medium" />
                              dojrzewa za {dni} {plural(dni, 'dzień', 'dni', 'dni')}
                            </span>
                          </>
                        ) : null}
                      </small>
                    </span>
                    <span className="pkt">
                      +{e.points}
                      <small>{dojrzewa ? 'czeka' : 'pkt'}</small>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <section className="sekcja">
          <header>
            <h2>Ile to punktów</h2>
          </header>
          <div className="cennik">
            <h3 style={{ '--c': 'var(--primary-400)' } as React.CSSProperties}>
              <Ico n="clipboard-text" />
              Rynek — ocena po zleceniu
            </h3>
            <div className="w">
              <span>Ocena 5/5</span>
              <b>{basePoints(5)}</b>
            </div>
            <div className="w">
              <span>Ocena 4/5</span>
              <b>{basePoints(4)}</b>
            </div>
            <div className="w">
              <span>Ocena 3/5</span>
              <b>{basePoints(3)}</b>
            </div>
            <div className="w">
              <span>Ocena 2/5 i niżej</span>
              <b>{basePoints(2)}</b>
            </div>
            <div className="w">
              <span>Kolejna ocena od tej samej firmy w 365 dni</span>
              <b>×0,5ⁿ</b>
            </div>
            <div className="w">
              <span>Firma młodsza niż 14 dni</span>
              <b>×0,5</b>
            </div>
            <h3 style={{ '--c': 'var(--t-pytanie)' } as React.CSSProperties}>
              <Ico n="chats-circle" />
              Społeczność — odpowiedzi
            </h3>
            <div className="w">
              <span>Uznana odpowiedź</span>
              <b>{FIRST_POINT.answerAcceptedPoints}</b>
            </div>
            <div className="w">
              <span>Głos za odpowiedź (konto ≥ 14 dni)</span>
              <b>10</b>
            </div>
            <div className="w">
              <span>Limit ścieżki</span>
              <b>
                {FIRST_POINT.communityWeeklyCap} / {FIRST_POINT.maturationDays} dni
              </b>
            </div>
            <h3 style={{ '--c': 'var(--warm)' } as React.CSSProperties}>
              <Ico n="hourglass-medium" />
              Każdy punkt dojrzewa {FIRST_POINT.maturationDays} dni
            </h3>
          </div>
        </section>
      </div>

      <section className="sekcja" style={{ borderBottom: 0 }}>
        <header>
          <h2>Czego Drabinka nie liczy</h2>
          <small>żeby status znaczył to samo dla każdego</small>
        </header>
        <div className="zero">
          {NIE_LICZY.map(([ik, t]) => (
            <span key={t}>
              <Ico n={ik} />
              {t}
              <b>0 pkt</b>
            </span>
          ))}
        </div>
        <div className="tylko-telefon" style={{ marginTop: 24 }}>
          <Stopka />
        </div>
      </section>
    </Rama>
  );
}

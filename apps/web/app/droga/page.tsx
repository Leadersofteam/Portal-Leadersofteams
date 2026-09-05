import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import { LadderArt } from '@/components/ui/ladder-art';
import { LEVEL_RULES_FALLBACK, type LevelRule } from '@/lib/levels';
import { SITE_URL } from '@/lib/site';
import { publicApi } from '@/lib/server-api';

// Droga Lidera (PL3) — opowieść, nie regulamin. Regulamin punktacji zostaje
// na /drabince; ta strona odpowiada na pytanie aspirującego: „co mnie czeka,
// szczebel po szczeblu, i skąd wezmę punkty". Progi i odblokowania czytamy
// z API (jedno źródło prawdy: ladder/rules.ts), teksty „co to znaczy" są
// tutaj — to narracja, nie konfiguracja. Statyczna (ISR) dla gości i botów.
export const metadata: Metadata = {
  title: 'Droga Lidera — od zera do Lidera, punkt po punkcie | Leaders of Teams',
  description:
    'Siedem szczebli Drabinki Lidera: co daje każdy poziom, ile punktów trzeba i skąd je wziąć. Punkty tylko od drugiego człowieka — za ocenioną pracę i uznany mentoring. Zero za zapraszanie.',
  alternates: { canonical: '/droga' },
};

export const revalidate = 300;

type LevelRow = LevelRule;

// Lustro liczb z ladder/rules.ts (ruleset v1). Zmiana tam = zmiana tutaj;
// pilnuje tego rozmowa z właścicielem, nie kod — to są zasady produktu.
const POINTS = {
  rating5: 100,
  rating4: 80,
  rating3: 40,
  answerAccepted: 50,
  answerUpvoted: 10,
  weeklyCommunityCap: 300,
  maturationDays: 7,
  youngCompanyDays: 14,
};

// „Co to znaczy w praktyce" — jedno zdanie na szczebel, z perspektywy osoby,
// która na nim stoi. Uzupełnia dane z API, nie dubluje ich.
const MEANING: Record<number, string> = {
  1: 'Pierwsze uznanie od drugiego człowieka: jedno zlecenie ocenione na 5/5 albo dwie zaakceptowane odpowiedzi. Od teraz jesteś Liderem, nie tylko kontem.',
  2: 'Trzy dobre zlecenia albo mieszanka pracy i mentoringu. Możesz zakładać grupy branżowe — masz już coś, wokół czego ludzie się zbierają.',
  3: 'Około siedmiu udanych realizacji. Firmy widzą poziom w katalogu i w pasie zaufania — zaczynasz dostawać zlecenia z progiem „od poziomu 3".',
  4: 'Tu kończy się wąska ścieżka: co najmniej 20% punktów musi pochodzić z KAŻDEJ z dwóch dróg. Praktyk, który nikomu nie pomaga, albo mentor bez realizacji — nie wejdzie wyżej.',
  5: 'Mentor. Odblokowujesz dostęp do aplikacji LOT — CRM, w którym prowadzi się zespół. Nagroda jest narzędziem pracy, nie odznaką.',
  6: 'Autorytet: Twoje uznane odpowiedzi ważą tyle, co realizacje. Poziom, którego nie da się osiągnąć jedną zaprzyjaźnioną firmą — malejące zwroty to gwarantują.',
  7: 'Szczyt. Własny zespół prowadzony w aplikacji LOT i prawo rekrutowania Liderów do niego. Bursztyn, którego nie kupisz.',
};

function unlocks(lvl: LevelRow): string[] {
  return [
    'większe zlecenia (próg „od poziomu")',
    lvl.level === 2 ? 'zakładanie grup branżowych' : null,
    lvl.unlocksAppAccess ? 'dostęp do aplikacji LOT (CRM zespołu)' : null,
    lvl.unlocksTeamCreation ? 'własny zespół w aplikacji LOT' : null,
  ].filter((x): x is string => Boolean(x));
}

export default async function DrogaPage() {
  // API jest źródłem prawdy; zapas z lib/levels.ts ratuje prerender przy
  // `next build` bez API (bez niego ISR zamrażał pustą stronę na 5 minut po
  // każdym wdrożeniu — złapane przez e2e, nie przez oko).
  const data = await publicApi<{ levels: LevelRow[] }>('/ladder/levels').catch(() => null);
  const fromApi = [...(data?.levels ?? [])].sort((a, b) => a.level - b.level);
  const levels = fromApi.length === 7 ? fromApi : LEVEL_RULES_FALLBACK;

  return (
    <main className="landing">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Leaders of Teams', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Droga Lidera', item: `${SITE_URL}/droga` },
          ],
        }}
      />
      {levels.length === 7 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Siedem poziomów Drabinki Lidera',
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            numberOfItems: 7,
            itemListElement: levels.map((l) => ({
              '@type': 'ListItem',
              position: l.level,
              name: `Poziom ${l.level} · ${l.name}`,
              description: `${l.pointsRequired} pkt. ${MEANING[l.level] ?? ''}`,
            })),
          }}
        />
      )}

      <section className="hero hero-split">
        <div className="hero-copy">
          <span className="hero-eyebrow">Droga Lidera</span>
          <h1>
            Od zera do Lidera. <span className="gradient-text">Punkt po punkcie.</span>
          </h1>
          <p>
            Siedem szczebli. Każdy punkt przyznaje drugi człowiek — Firma, która oceniła Twoją
            pracę, albo Lider, który uznał Twoją odpowiedź. Nie da się kupić, nie da się
            wyrekrutować, nie da się wysiedzieć. Poniżej cała droga, tak jak ją przejdziesz.
          </p>
          <div className="hero-cta">
            <Link className="btn" href="/rejestracja">
              Zacznij od poziomu 0
            </Link>
            <Link className="btn secondary" href="/drabinka">
              Regulamin punktacji
            </Link>
          </div>
        </div>
        <div className="hero-art-wrap">
          <LadderArt />
        </div>
      </section>

      <section>
        <span className="section-eyebrow">Szczebel po szczeblu</span>
        <h2>Co czeka na każdym poziomie</h2>
        {levels.length !== 7 ? (
          <p className="muted">
            Nie udało się wczytać progów. Zasady się nie zmieniły —{' '}
            <Link href="/drabinka">zobacz regulamin</Link> albo odśwież za chwilę.
          </p>
        ) : (
          <ol className="droga-rail">
            {levels.map((lvl) => (
              <li
                key={lvl.level}
                className={`droga-rung${lvl.level === 7 ? ' droga-rung--top' : ''}`}
                style={{ '--lv': `var(--level-${lvl.level})` } as React.CSSProperties}
              >
                <span className="droga-rung-num" aria-hidden="true">
                  {lvl.level}
                </span>
                <h3>
                  Poziom {lvl.level} · {lvl.name}
                </h3>
                <p className="droga-rung-threshold">
                  <strong>{lvl.pointsRequired}</strong> pkt
                  {lvl.minPathSharePct > 0
                    ? ` · min. ${lvl.minPathSharePct}% z każdej z dwu dróg`
                    : ''}{' '}
                  · odblokowuje: {unlocks(lvl).join(', ')}
                </p>
                <p className="droga-rung-unlock">{MEANING[lvl.level]}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <span className="section-eyebrow">Skąd biorą się punkty</span>
        <h2>Dwie drogi. Obie prowadzą przez drugiego człowieka.</h2>
        <div className="droga-paths">
          <div className="card">
            <h3>Praca: zlecenie ocenione przez Firmę</h3>
            <p className="muted">
              Po obustronnym potwierdzeniu realizacji Firma ocenia. 5/5 → {POINTS.rating5} pkt, 4/5
              → {POINTS.rating4}, 3/5 → {POINTS.rating3}, niżej → 0. Punkty dojrzewają{' '}
              {POINTS.maturationDays} dni (czas na spór i kontrolę antyfraudową), a oceny publikują
              się symultanicznie — nikt nie ocenia „w odwecie".
            </p>
            <p className="droga-ledger">
              Wpis z księgi (przykład zgodny z regułami): <strong>50 pkt</strong> · zlecenie
              ocenione 5/5 · waga 0,5, bo Firma miała mniej niż {POINTS.youngCompanyDays} dni ·
              dojrzewa do 12.09
            </p>
          </div>
          <div className="card">
            <h3>Mentoring: odpowiedź uznana przez Lidera</h3>
            <p className="muted">
              W grupach branżowych ktoś pyta, Ty odpowiadasz. Autor akceptuje →{' '}
              {POINTS.answerAccepted} pkt; kwalifikowany głos „pomogło" → {POINTS.answerUpvoted}.
              Limit {POINTS.weeklyCommunityCap} pkt tygodniowo, a kolejne uznania od tej samej osoby
              ważą coraz mniej. Mentoring liczy się tak samo jak praca — od poziomu 4 jest wymagany.
            </p>
            <p className="droga-ledger">
              Wpis z księgi: <strong>25 pkt</strong> · odpowiedź zaakceptowana · waga 0,5, bo to
              drugie uznanie od tego samego autora pytania
            </p>
          </div>
        </div>
      </section>

      <section>
        <span className="section-eyebrow">Ściana szerokości</span>
        <h2>Dlaczego z wąskim kręgiem nie wejdziesz wysoko</h2>
        <p>
          Każde kolejne zlecenie od tej samej Firmy w ciągu roku waży połowę poprzedniego (50%, 25%,
          12,5%… nigdy poniżej 10%). Każde kolejne uznanie od tej samej osoby — tak samo. Od poziomu
          4 co najmniej 20% punktów musi pochodzić z każdej z dwu dróg. Skutek: żeby wejść wysoko,
          musisz być uznany przez <strong>wielu różnych ludzi</strong> — i za pracę, i za pomoc. To
          nie jest utrudnienie. To jest definicja Lidera, zapisana w kodzie zamiast w regulaminie.{' '}
          <strong>Zero punktów za zapraszanie</strong>, rekrutację, logowanie czy publikowanie —
          Drabinka nie widzi tych zdarzeń wcale.
        </p>
      </section>

      <section className="droga-story">
        <span className="section-eyebrow">Jak to wygląda w praktyce</span>
        <h2>Pierwszy szczebel w tydzień pracy</h2>
        <p>
          Konrad wchodzi z poziomem 0. Bierze trzy mniejsze zlecenia od trzech różnych Firm — 100
          pkt za pierwsze (5/5), 50 za drugie (Firma młodsza niż {POINTS.youngCompanyDays} dni), 100
          za trzecie. W grupie Sprzedaż odpowiada na pytanie o proces ofertowania; autor akceptuje —{' '}
          {POINTS.answerAccepted} pkt. Po tygodniu dojrzewania: <strong>300 pkt</strong>, poziom 2 ·
          Praktyk. Żaden punkt nie przyszedł od Portalu. Każdy — od kogoś, komu Konrad realnie
          pomógł.
        </p>
        <p className="muted">
          <small>
            Historia z wyprawy testowej Portalu (sierpień 2026, persona „Konrad Jaworowski"): realne
            mechanizmy, przyspieszony czas. Pierwsi Liderzy dopisują tu własne historie.
          </small>
        </p>
      </section>

      <section>
        <h2>Zacznij od poziomu 0</h2>
        <p className="muted">
          Konto jest bezpłatne i nic samo w sobie nie daje. Pierwszy punkt przyjdzie od pierwszego
          człowieka, któremu pomożesz — i to jest cała różnica.
        </p>
        <div className="hero-cta">
          <Link className="btn" href="/rejestracja">
            Zacznij od poziomu 0
          </Link>
          <Link className="btn secondary" href="/zlecenia">
            Zobacz otwarte zlecenia
          </Link>
          <Link className="btn secondary" href="/dla-firm">
            Reprezentuję Firmę
          </Link>
        </div>
      </section>
    </main>
  );
}

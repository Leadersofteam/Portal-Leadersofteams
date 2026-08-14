import Link from 'next/link';

import { LevelBadge } from '@/components/ui/level-badge';
import { serverApi } from '@/lib/server-api';

interface LevelRow {
  level: number;
  name: string;
  pointsRequired: number;
  minPathSharePct: number;
  unlocksAppAccess: boolean;
  unlocksTeamCreation: boolean;
}

// Jedno źródło opisu odblokowań — używane i przez tabelę (desktop), i przez
// karty (mobile). Rozjazd tych dwóch list byłby niewidoczny do pierwszej skargi.
function levelUnlocks(lvl: LevelRow): string {
  return [
    'większe zlecenia',
    lvl.level === 2 ? 'zakładanie grup branżowych' : null,
    lvl.unlocksAppAccess ? 'wyróżnienie i pierwszeństwo w katalogu Liderów' : null,
    lvl.unlocksTeamCreation ? 'założenie własnego zespołu w Portalu' : null,
  ]
    .filter(Boolean)
    .join(', ');
}

export const metadata = {
  title: 'Drabinka Lidera — zasady punktacji — Leaders of Teams',
  description:
    'Jawne zasady awansu: punkty wyłącznie za ocenione zlecenia i uznany mentoring. Zero punktów za zapraszanie i rekrutację.',
};

export default async function LadderRulesPage() {
  const data = await serverApi<{ levels: LevelRow[] }>('/ladder/levels');
  const levels = data?.levels ?? [];

  return (
    <main>
      <h1>Drabinka Lidera — jawne zasady</h1>
      <p>
        Tytuł Lidera i poziomy zdobywa się wyłącznie{' '}
        <strong>realną, uznaną przez innych pracą</strong>. Punkty pochodzą z dwóch równoważnych
        źródeł: <strong>zrealizowanych zleceń ocenionych przez Firmy</strong> oraz{' '}
        <strong>mentoringu docenionego przez innych Liderów</strong> — w{' '}
        <Link href="/grupy">pytaniach i odpowiedziach grup branżowych</Link>.
      </p>

      <div className="card accent-edge">
        <h2>Czego w Drabince NIE ma — i nigdy nie będzie</h2>
        <p>
          <strong>Zero punktów za zapraszanie i rekrutację.</strong> Zero punktów za samo logowanie,
          aktywność czy publikowanie treści. Zero „streaków" i utraty poziomu za nieobecność —
          poziom raz zdobyty nie wygasa. To nie jest system typu MLM: awansu nie da się kupić ani
          „wykręcić" zaangażowaniem — trzeba dostarczyć wartość, którą ktoś inny uzna. Ta zasada
          jest wbudowana w architekturę systemu, nie tylko w regulamin.
        </p>
      </div>

      <h2>Jak liczą się punkty (ruleset v1)</h2>
      <ul>
        <li>
          <strong>Ocenione zlecenie:</strong> 5/5 → 100 pkt, 4/5 → 80 pkt, 3/5 → 40 pkt, 2/5 i niżej
          → 0 pkt. Punkty przyznaje ocena Firmy po obustronnym potwierdzeniu realizacji.
        </li>
        <li>
          <strong>Karencja 7 dni:</strong> punkty najpierw są „w karencji" i dopiero po tygodniu
          zaliczają się do awansu — to czas na weryfikację antyfraudową i ewentualne spory.
        </li>
        <li>
          <strong>Malejące zwroty:</strong> kolejne zlecenia od tej samej firmy w ciągu roku ważą
          coraz mniej (50%, 25%… min. 10%). Stała współpraca się liczy, ale podbijanie poziomu jedną
          zaprzyjaźnioną firmą — nie.
        </li>
        <li>
          <strong>Świeże firmy ważą mniej:</strong> oceny od firm młodszych niż 14 dni liczą się z
          wagą 50%, dopóki firma nie zbuduje historii.
        </li>
        <li>
          <strong>Oceny publikują się symultanicznie:</strong> obie strony oceniają „w ciemno" (albo
          po 14 dniach) — bez ocen odwetowych.
        </li>
        <li>
          <strong>Wszystko widzisz:</strong> ekran <Link href="/panel/punkty">Moje punkty</Link>{' '}
          pokazuje każdy wpis — za co, ile, z jaką wagą i dlaczego.
        </li>
      </ul>

      <h2>Poziomy i progi</h2>
      {levels.length === 7 && (
        <div className="ladder-visual" aria-hidden="true">
          {levels.map((lvl) => (
            <div key={lvl.level} className="rung">
              <span>{lvl.name}</span>
              {lvl.level}
            </div>
          ))}
        </div>
      )}
      {/* Na telefonie tabela z czterema kolumnami jest nieczytelna nawet ze
          scrollem — te same dane idą jako karty, jedna na szczebel. */}
      <div className="rung-cards">
        {levels.map((lvl) => (
          <div
            key={lvl.level}
            className="rung-card"
            style={{ '--rung-color': `var(--level-${lvl.level})` } as React.CSSProperties}
          >
            <span className="rung-card-level">{lvl.level}</span>
            <h3 className="rung-card-name">{lvl.name}</h3>
            <p className="rung-card-meta">
              {lvl.pointsRequired} pkt
              {lvl.minPathSharePct > 0 ? ` · min. ${lvl.minPathSharePct}% z każdej ścieżki` : ''}
            </p>
            <p className="rung-card-unlock">{levelUnlocks(lvl)}</p>
          </div>
        ))}
      </div>

      <div className="table-wrap desktop-only">
        <table>
          <thead>
            <tr>
              {['Poziom', 'Próg punktów', 'Wymóg obu ścieżek', 'Odblokowuje'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((lvl) => (
              <tr key={lvl.level}>
                <td>
                  <LevelBadge level={lvl.level} name={lvl.name} />
                </td>
                <td>{lvl.pointsRequired}</td>
                <td>{lvl.minPathSharePct > 0 ? `min. ${lvl.minPathSharePct}% z każdej` : '—'}</td>
                <td>{levelUnlocks(lvl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted mt-2">
        Od poziomu 4 wymagany jest wkład z obu ścieżek — najwyższe poziomy oznaczają zarówno
        praktyka, jak i mentora. Zmiany zasad są wersjonowane i nigdy nie działają wstecz.
      </p>
    </main>
  );
}

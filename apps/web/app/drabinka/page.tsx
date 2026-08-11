import Link from 'next/link';

import { serverApi } from '@/lib/server-api';

interface LevelRow {
  level: number;
  name: string;
  pointsRequired: number;
  minPathSharePct: number;
  unlocksAppAccess: boolean;
  unlocksTeamCreation: boolean;
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

      <div className="card" style={{ borderColor: 'var(--accent)' }}>
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
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Poziom', 'Nazwa', 'Próg punktów', 'Wymóg obu ścieżek', 'Odblokowuje'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '0.5rem',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((lvl) => (
              <tr key={lvl.level}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  {lvl.level}
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  {lvl.name}
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  {lvl.pointsRequired}
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  {lvl.minPathSharePct > 0 ? `min. ${lvl.minPathSharePct}% z każdej` : '—'}
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  {[
                    'większe zlecenia',
                    lvl.level === 2 ? 'zakładanie grup branżowych' : null,
                    lvl.unlocksAppAccess ? 'wyróżnienie i pierwszeństwo w katalogu Liderów' : null,
                    lvl.unlocksTeamCreation ? 'założenie własnego zespołu w Portalu' : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: '1rem' }}>
        Od poziomu 4 wymagany jest wkład z obu ścieżek — najwyższe poziomy oznaczają zarówno
        praktyka, jak i mentora. Zmiany zasad są wersjonowane i nigdy nie działają wstecz.
      </p>
    </main>
  );
}

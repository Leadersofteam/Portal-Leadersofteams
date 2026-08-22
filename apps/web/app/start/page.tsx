import { redirect } from 'next/navigation';

import { LadderArt } from '@/components/ui/ladder-art';
import { serverApi } from '@/lib/server-api';

import { Wizard } from './wizard';

export const metadata = {
  title: 'Zacznij tutaj — Leaders of Teams',
  robots: { index: false, follow: false },
};

export default async function StartPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const industries = await serverApi<{ industries: Array<{ id: string; name: string }> }>(
    '/industries',
  );

  return (
    <main className="start-page">
      <div className="start-hero">
        <div>
          <p className="climber-kicker">Pierwsza mila</p>
          <h1>Witaj u podnóża</h1>
          <p>
            Leaders of Teams stoi na jednej zasadzie: <strong>status trzeba zapracować</strong>.
            Poziomu nie da się kupić ani wyrekrutować — zdobywa się go, gdy drugi człowiek uzna
            Twoją pracę: Firma po zrealizowanym zleceniu albo Lider, którego odpowiedź faktycznie
            pomogła.
          </p>
          <p className="muted">Trzy krótkie kroki. Każdy możesz pominąć.</p>
        </div>
        <div className="start-art">
          <LadderArt />
        </div>
      </div>

      <Wizard industries={industries?.industries ?? []} />
    </main>
  );
}

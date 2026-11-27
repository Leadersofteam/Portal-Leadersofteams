import { redirect } from 'next/navigation';

import { DrabinaArt } from '@/components/v17p6/czesci';
import { RamaPubliczna } from '@/components/v17p6/rama';
import { serverApi } from '@/lib/server-api';

import { Kreator } from './kreator';

export { metadata } from '@/app/start/page';

export default async function StartV17() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const industries = await serverApi<{ industries: Array<{ id: string; name: string }> }>(
    '/industries',
  );

  return (
    <RamaPubliczna>
      <div className="start">
        <div className="p-start-hero">
          <div>
            <p className="nadtytul">Pierwsza mila</p>
            <h1>Witaj u podnóża</h1>
            <p>
              Leaders of Teams stoi na jednej zasadzie: <strong>status trzeba zapracować</strong>.
              Poziomu nie da się kupić ani wyrekrutować — zdobywa się go, gdy drugi człowiek uzna
              Twoją pracę: Firma po zrealizowanym zleceniu albo Lider, którego odpowiedź faktycznie
              pomogła.
            </p>
            <p className="cicho">Trzy krótkie kroki. Każdy możesz pominąć.</p>
          </div>
          <div>
            <DrabinaArt />
          </div>
        </div>
        <Kreator industries={industries?.industries ?? []} />
      </div>
    </RamaPubliczna>
  );
}

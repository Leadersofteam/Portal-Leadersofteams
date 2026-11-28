import Link from 'next/link';

import type { ForLeader } from '@/app/zlecenia/nowe/new-order-form';
import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Rama } from '@/components/v17/rama';
import { jaRamy } from '@/components/v17/reszta-formularze';
import { ZlecenieFormularz } from '@/components/v17/reszta-formularze-zlecenie';
import { Wstecz } from '@/components/v17/rynek';
import { serverApi } from '@/lib/server-api';
import { loadJa } from '@/lib/v17-data';

export const metadata = { title: 'Nowe zlecenie — Leaders of Teams' };

// Ta sama logika wejścia co app/zlecenia/nowe/page.tsx: gość widzi formularz, nie ścianę logowania (PL2).
export default async function NoweZlecenieV17({
  searchParams,
}: {
  searchParams: Promise<{ lider?: string }>;
}) {
  const { lider } = await searchParams;
  // Id z adresu idzie do ścieżki API — tylko znaki cuid, nic, co zmieni ścieżkę.
  const leaderData =
    lider && /^[a-z0-9]{10,40}$/.test(lider)
      ? await serverApi<{
          profile: { id: string; displayName: string; industry: { id: string; name: string } };
        }>(`/leaders/${lider}`)
      : null;
  const dlaLidera: ForLeader | null = leaderData
    ? {
        id: leaderData.profile.id,
        name: leaderData.profile.displayName,
        industryId: leaderData.profile.industry.id,
        industryName: leaderData.profile.industry.name,
      }
    : null;

  const ja = await loadJa();
  const [firmy, branze] = await Promise.all([
    ja
      ? serverApi<{
          companies: Array<{ id: string; name: string; nipVerifiedAt: string | null }>;
        }>('/me/companies')
      : null,
    serverApi<{ industries: Array<{ id: string; name: string }> }>('/industries'),
  ]);
  // Pusta lista przy błędzie API udawałaby „nie masz firmy” — wolimy stan błędu.
  if (!branze || (ja && !firmy)) throw new Error('Nowe zlecenie: API nie odpowiada');
  const companies = firmy?.companies ?? [];
  const pierwsza = companies[0];

  return (
    <Rama
      aktywny="zlecenia"
      szeroka
      reszta
      ja={
        ja
          ? {
              ...jaRamy(ja),
              firma: pierwsza ? { nazwa: pierwsza.name, branza: pierwsza.name } : undefined,
            }
          : null
      }
    >
      {ja && !pierwsza ? (
        <div className="st">
          <Wstecz href="/zlecenia">Zlecenia</Wstecz>
          <Komunikat
            ikona="buildings"
            tytul="Najpierw dodaj firmę"
            opis="Zlecenia publikuje się w imieniu firmy. Utwórz profil firmowy — zajmie to minutę, potem wrócisz do zlecenia."
          >
            <Link className="vbtn glowny" href="/firma/nowa">
              <Ico n="plus" />
              Utwórz profil firmy
            </Link>
          </Komunikat>
        </div>
      ) : (
        <ZlecenieFormularz
          gosc={!ja}
          firmy={companies}
          branze={branze.industries}
          dlaLidera={dlaLidera}
        />
      )}
    </Rama>
  );
}

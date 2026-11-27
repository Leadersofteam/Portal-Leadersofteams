import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Ico } from '@/components/v17/ico';
import { Komunikat } from '@/components/v17/karty';
import { Rama } from '@/components/v17/rama';
import { jaRamy } from '@/components/v17/reszta-formularze';
import { UslugaFormularz } from '@/components/v17/reszta-formularze-usluga';
import { Wstecz } from '@/components/v17/rynek';
import { serverApi } from '@/lib/server-api';
import { loadJa } from '@/lib/v17-data';

export const metadata = { title: 'Nowa usługa — Leaders of Teams' };

export default async function NowaUslugaV17() {
  const ja = await loadJa();
  if (!ja) redirect('/logowanie');

  const [profil, branze] = await Promise.all([
    serverApi<{ profile: { id: string } | null }>('/me/leader-profile'),
    serverApi<{ industries: Array<{ id: string; name: string }> }>('/industries'),
  ]);
  // Błąd API nie może udawać „nie masz profilu”.
  if (!profil || !branze) throw new Error('Nowa usługa: API nie odpowiada');
  const oceny = profil.profile
    ? await serverApi<{ profile: { averageRating: number | null; reviewCount: number } }>(
        `/leaders/${profil.profile.id}`,
      )
    : null;

  return (
    <Rama aktywny="uslugi" szeroka reszta ja={jaRamy(ja)}>
      {profil.profile ? (
        <UslugaFormularz
          branze={branze.industries}
          autor={{
            name: ja.displayName,
            level: ja.level,
            avatarFileId: ja.avatarFileId,
            srednia: oceny?.profile.averageRating ?? null,
            liczbaOcen: oceny?.profile.reviewCount ?? 0,
          }}
        />
      ) : (
        <div className="st">
          <Wstecz href="/panel/uslugi">Moje usługi</Wstecz>
          <Komunikat
            ikona="identification-card"
            tytul="Najpierw utwórz profil Lidera"
            opis="Usługi publikują Liderzy. Wybierz branżę i przedstaw się — potem wrócisz do formularza."
          >
            <Link className="vbtn glowny" href="/panel/profil">
              <Ico n="plus" />
              Utwórz profil Lidera
            </Link>
          </Komunikat>
        </div>
      )}
    </Rama>
  );
}

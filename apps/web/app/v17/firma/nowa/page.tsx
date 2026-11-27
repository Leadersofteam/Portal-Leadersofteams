import Link from 'next/link';

import { Komunikat } from '@/components/v17/karty';
import { Rama } from '@/components/v17/rama';
import { jaRamy } from '@/components/v17/reszta-formularze';
import { FirmaFormularz } from '@/components/v17/reszta-formularze-firma';
import { Wstecz } from '@/components/v17/rynek';
import { serverApiStatus } from '@/lib/server-api';
import { loadJa } from '@/lib/v17-data';

export default async function NowaFirmaV17() {
  // Gość i martwe API to nie to samo: /auth/me odpowiada gościowi 401 (to nie awaria),
  // a przy braku API albo 5xx pokazujemy błąd, nie „zaloguj się”.
  const { status } = await serverApiStatus('/auth/me');
  if (status === 0 || status >= 500) throw new Error(`Nowa firma: API zwróciło ${status}`);
  const ja = await loadJa();

  return (
    <Rama aktywny="zlecenia" szeroka reszta ja={ja ? jaRamy(ja) : null}>
      {ja ? (
        <FirmaFormularz />
      ) : (
        <div className="st">
          <Wstecz href="/dla-firm">Dla firm</Wstecz>
          <Komunikat
            ikona="buildings"
            tytul="Zaloguj się, żeby dodać firmę"
            opis="Profil firmy jest przypisany do konta. Nie masz konta? Opisz potrzebę — konto i firmę założysz jednym formularzem."
          >
            <Link className="vbtn glowny" href="/logowanie">
              Zaloguj się
            </Link>
            <Link className="vbtn obrys" href="/zlecenia/nowe">
              Opisz potrzebę
            </Link>
          </Komunikat>
        </div>
      )}
    </Rama>
  );
}

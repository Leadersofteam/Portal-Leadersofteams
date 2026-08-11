import Link from 'next/link';
import { redirect } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

import { NewListingForm } from './new-listing-form';

export const metadata = { title: 'Nowa usługa — Leaders of Teams' };

export default async function NewListingPage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const [profileData, industriesData] = await Promise.all([
    serverApi<{ profile: { id: string } | null }>('/me/leader-profile'),
    serverApi<{ industries: Array<{ id: string; name: string }> }>('/industries'),
  ]);

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel/uslugi">← Moje usługi</Link>
      </div>
      <h1>Nowa usługa</h1>
      {profileData?.profile ? (
        <>
          <p className="muted">
            Opisz konkretny rezultat, podziel ofertę na pakiety i zadeklaruj ceny. Usługa trafi do
            katalogu po publikacji.
          </p>
          <NewListingForm industries={industriesData?.industries ?? []} />
        </>
      ) : (
        <p className="muted">
          Usługi publikują Liderzy — najpierw{' '}
          <Link href="/panel/profil">utwórz profil Lidera</Link>.
        </p>
      )}
    </main>
  );
}

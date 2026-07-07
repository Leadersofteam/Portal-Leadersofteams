import Link from 'next/link';
import { redirect } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

import { ProfileForm } from './profile-form';

export const metadata = { title: 'Profil Lidera — Leaders of Teams' };

export default async function ProfilePage() {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const [profileData, industriesData] = await Promise.all([
    serverApi<{ profile: never | null }>('/me/leader-profile'),
    serverApi<{ industries: Array<{ id: string; name: string }> }>('/industries'),
  ]);

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link>
      </div>
      <ProfileForm
        industries={industriesData?.industries ?? []}
        profile={profileData?.profile ?? null}
      />
    </main>
  );
}

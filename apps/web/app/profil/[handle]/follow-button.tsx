'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export function FollowButton({
  userId,
  initiallyFollowing,
}: {
  userId: string;
  initiallyFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      await apiFetch(`/users/${userId}/follow`, { method: following ? 'DELETE' : 'PUT' });
      setFollowing(!following);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        router.push('/logowanie');
        return;
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={following ? 'btn secondary' : 'btn'}
      disabled={pending}
      onClick={() => void toggle()}
    >
      {following ? 'Obserwujesz ✓' : 'Obserwuj'}
    </button>
  );
}

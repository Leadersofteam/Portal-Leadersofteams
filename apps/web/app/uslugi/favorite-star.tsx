'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Gwiazdka „zapisz usługę" — dla niezalogowanych prowadzi do logowania.
export function FavoriteStar({ listingId, initial }: { listingId: string; initial: boolean }) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initial);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      await apiFetch(`/listings/${listingId}/favorite`, {
        method: favorite ? 'DELETE' : 'PUT',
      });
      setFavorite(!favorite);
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
      className="fav-star"
      aria-pressed={favorite}
      aria-label={favorite ? 'Usuń z zapisanych' : 'Zapisz usługę'}
      title={favorite ? 'Usuń z zapisanych' : 'Zapisz usługę'}
      onClick={() => void toggle()}
      disabled={pending}
    >
      {favorite ? '★' : '☆'}
    </button>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export function ListingActions({
  listingId,
  status,
}: {
  listingId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function act(action: 'publish' | 'pause' | 'archive') {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/listings/${listingId}/${action}`, { method: 'POST' });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="actions-row" style={{ margin: 0 }}>
      {error && <span className="badge warning">{error}</span>}
      {(status === 'DRAFT' || status === 'PAUSED') && (
        <button className="btn" disabled={pending} onClick={() => void act('publish')}>
          Opublikuj
        </button>
      )}
      {status === 'PUBLISHED' && (
        <button className="btn secondary" disabled={pending} onClick={() => void act('pause')}>
          Wstrzymaj
        </button>
      )}
      {status !== 'ARCHIVED' && (
        <button className="btn secondary" disabled={pending} onClick={() => void act('archive')}>
          Archiwizuj
        </button>
      )}
    </div>
  );
}

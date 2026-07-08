'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiFetch } from '@/lib/api';

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn secondary"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void (async () => {
          try {
            await apiFetch('/me/notifications/read', {
              method: 'POST',
              body: JSON.stringify({ all: true }),
            });
            router.refresh();
          } finally {
            setPending(false);
          }
        })();
      }}
    >
      {pending ? '…' : 'Oznacz wszystkie jako przeczytane'}
    </button>
  );
}

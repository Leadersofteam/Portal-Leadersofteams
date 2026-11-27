'use client';

// Wypis z digestu po tokenie z maila — wspólny dla obu wyglądów.
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { apiFetch } from '@/lib/api';

export type StanWypisu = 'pending' | 'done' | 'failed';

export function useWypis(): StanWypisu {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [stan, setStan] = useState<StanWypisu>('pending');
  // React 18/19 w dev odpala efekty dwukrotnie — wypis jest idempotentny po
  // stronie API, ale nie ma powodu strzelać dwa razy.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (!token) {
      setStan('failed');
      return;
    }
    apiFetch<{ ok: boolean }>('/digest/wypis', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((res) => setStan(res.ok ? 'done' : 'failed'))
      .catch(() => setStan('failed'));
  }, [token]);

  return stan;
}

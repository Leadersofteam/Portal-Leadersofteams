'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export function ResolveButtons({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resolve(action: 'RELEASE' | 'REJECT') {
    const note = window.prompt(
      action === 'RELEASE'
        ? 'Uzasadnienie zwolnienia punktów (min. 5 znaków):'
        : 'Uzasadnienie odrzucenia punktów (min. 5 znaków):',
    );
    if (!note) return;
    setError(null);
    setPending(true);
    try {
      await apiFetch(`/moderation/cases/${caseId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action, note }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="actions-row" style={{ margin: '0.5rem 0 0' }}>
      <button className="btn" disabled={pending} onClick={() => void resolve('RELEASE')}>
        Zwolnij punkty
      </button>
      <button className="btn secondary" disabled={pending} onClick={() => void resolve('REJECT')}>
        Odrzuć punkty
      </button>
      {error && <span className="error-box">{error}</span>}
    </div>
  );
}

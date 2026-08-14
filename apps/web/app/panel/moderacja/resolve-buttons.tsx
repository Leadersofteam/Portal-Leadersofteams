'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ModerationAction } from '@lot/contracts';

import { ApiRequestError, apiFetch } from '@/lib/api';

const PROMPTS: Record<ModerationAction, string> = {
  RELEASE: 'Uzasadnienie zwolnienia punktów (min. 5 znaków):',
  REJECT: 'Uzasadnienie odrzucenia punktów (min. 5 znaków):',
  HIDE: 'Uzasadnienie ukrycia treści (min. 5 znaków) — trafia do rejestru sprawy:',
  DISMISS: 'Dlaczego zgłoszenie nie wymaga działania? (min. 5 znaków):',
};

export function ResolveButtons({
  caseId,
  hasPointEvent,
  canHide,
}: {
  caseId: string;
  hasPointEvent: boolean;
  canHide: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resolve(action: ModerationAction) {
    const note = window.prompt(PROMPTS[action]);
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
      {/* Akcje punktowe pokazujemy WYŁĄCZNIE gdy sprawa ma wpis punktowy —
          inaczej interfejs proponowałby operację, którą API i tak odrzuci. */}
      {hasPointEvent && (
        <>
          <button className="btn" disabled={pending} onClick={() => void resolve('RELEASE')}>
            Zwolnij punkty
          </button>
          <button
            className="btn secondary"
            disabled={pending}
            onClick={() => void resolve('REJECT')}
          >
            Odrzuć punkty
          </button>
        </>
      )}
      {canHide && (
        <button className="btn" disabled={pending} onClick={() => void resolve('HIDE')}>
          Ukryj treść
        </button>
      )}
      <button className="btn secondary" disabled={pending} onClick={() => void resolve('DISMISS')}>
        Zamknij bez działania
      </button>
      {error && <span className="error-box">{error}</span>}
    </div>
  );
}

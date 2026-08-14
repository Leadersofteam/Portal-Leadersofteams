'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Wspólny przycisk „POST na ścieżkę i odśwież". Mieszkał w
// `app/zlecenia/[id]/actions.tsx`, ale od S18 potrzebuje go też panel ofert,
// a import z katalogu z segmentem dynamicznym (`[id]`) czyta się fatalnie.
export function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setPending(true);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return { run, error, pending };
}

export function ActionButton({
  path,
  label,
  variant = 'primary',
}: {
  path: string;
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const { run, error, pending } = useAction();
  return (
    <span>
      <button
        className={variant === 'primary' ? 'btn' : 'btn secondary'}
        disabled={pending}
        onClick={() => void run(() => apiFetch(path, { method: 'POST' }))}
      >
        {pending ? '…' : label}
      </button>
      {error && (
        <span className="error-box" style={{ display: 'inline-block', marginLeft: 8 }}>
          {error}
        </span>
      )}
    </span>
  );
}

/**
 * Wariant z potwierdzeniem w miejscu — dla akcji, których nie da się cofnąć.
 * Świadomie BEZ natywnego `confirm()`: natywnego dialogu nie da się uczciwie
 * przejść w teście e2e, a odruchowe „OK" nie jest decyzją.
 */
export function ConfirmActionButton({
  path,
  label,
  confirmLabel,
  question,
}: {
  path: string;
  label: string;
  confirmLabel: string;
  question: string;
}) {
  const { run, error, pending } = useAction();
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <span>
        <button className="btn secondary" onClick={() => setAsking(true)}>
          {label}
        </button>
        {error && (
          <span className="error-box" style={{ display: 'inline-block', marginLeft: 8 }}>
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="confirm-inline">
      <span className="muted">{question}</span>
      <button
        className="btn danger"
        disabled={pending}
        onClick={() => void run(() => apiFetch(path, { method: 'POST' }))}
      >
        {pending ? '…' : confirmLabel}
      </button>
      <button className="btn secondary" disabled={pending} onClick={() => setAsking(false)}>
        Anuluj
      </button>
    </span>
  );
}

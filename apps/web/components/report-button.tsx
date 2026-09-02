'use client';

import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Przycisk „zgłoś" (D7) — zgłoszenie Posta/Wątku/Zlecenia do moderacji
// (ModerationCase źródło REPORT). Widoczny dla zalogowanych.
export function ReportButton({
  subjectType,
  subjectId,
}: {
  subjectType: 'POST' | 'THREAD' | 'ORDER' | 'SOCIAL_POST';
  subjectId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 5) {
      setError('Powód: min. 5 znaków.');
      return;
    }
    setState('sending');
    setError(null);
    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({ subjectType, subjectId, reason: reason.trim() }),
      });
      setState('done');
      setOpen(false);
    } catch (err) {
      setState('error');
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się wysłać zgłoszenia.');
    }
  }

  if (state === 'done') return <span className="badge">Zgłoszono — dziękujemy</span>;

  if (!open) {
    return (
      // „Zgłoś nadużycie", nie samo „Zgłoś" (W-02): na stronie zlecenia goły
      // czasownik czytał się jak „zgłoś się do zlecenia" — dokładnie odwrotność
      // intencji, tuż nad formularzem oferty.
      <button className="btn secondary" onClick={() => setOpen(true)}>
        Zgłoś nadużycie
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: '0.5rem' }}>
      <div className="field">
        <label htmlFor="report-reason">Powód zgłoszenia</label>
        <textarea
          id="report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={5}
          maxLength={2000}
        />
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="actions-row">
        <button className="btn" disabled={state === 'sending'} onClick={() => void submit()}>
          {state === 'sending' ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}
        </button>
        <button className="btn secondary" onClick={() => setOpen(false)}>
          Anuluj
        </button>
      </div>
    </div>
  );
}

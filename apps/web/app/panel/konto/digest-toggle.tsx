'use client';

import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Przełącznik dziennego digestu e-mail. Stan początkowy przychodzi z serwera
// (strona konta czyta GET /me/digest) — bez tego przycisk przez moment
// kłamałby o stanie, którego jeszcze nie zna.
export function DigestToggle({ initialOptedOut }: { initialOptedOut: boolean }) {
  const [optedOut, setOptedOut] = useState(initialOptedOut);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setSaving(true);
    try {
      const next = !optedOut;
      await apiFetch('/me/digest', {
        method: 'POST',
        body: JSON.stringify({ optedOut: next }),
      });
      setOptedOut(next);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się zapisać zmiany.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card mt-3">
      <h3>Powiadomienia e-mail</h3>
      <p>
        Piszemy do Ciebie, gdy dzieje się coś, co wymaga Twojej reakcji: nowa oferta do zlecenia,
        wiadomość w rozmowie, oddana praca, przyjęta oferta. Raz dziennie dochodzi jedno zbiorcze
        podsumowanie pozostałych powiadomień. Maile o resecie hasła i weryfikacji adresu działają
        niezależnie od tego ustawienia.
      </p>
      {error && <div className="error-box">{error}</div>}
      <div className="actions-row">
        <button className="btn secondary" onClick={() => void toggle()} disabled={saving}>
          {saving
            ? 'Zapisuję…'
            : optedOut
              ? 'Włącz powiadomienia e-mail'
              : 'Wyłącz powiadomienia e-mail'}
        </button>
        <span className={optedOut ? 'badge warning' : 'badge success'}>
          {optedOut ? 'wyłączone' : 'włączone'}
        </span>
      </div>
    </section>
  );
}

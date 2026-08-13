'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';

/**
 * Baner „potwierdź adres" dla kont z niepotwierdzonym e-mailem.
 *
 * Stan czytamy z API przy każdym wejściu, NIE z migawki sesji: sesja jest
 * zamrożona przy logowaniu (ta sama pułapka, która przy roli MODERATOR
 * kosztowała nas pięć czerwonych testów), więc baner oparty na sesji wisiałby
 * jeszcze długo po kliknięciu w link aktywacyjny.
 *
 * Renderujemy dopiero po odpowiedzi serwera — mignięcie banera u osoby
 * z potwierdzonym adresem byłoby gorsze niż jego chwilowy brak.
 */
export function VerifyBanner() {
  const [status, setStatus] = useState<{ email: string; verified: boolean } | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    apiFetch<{ email: string; verified: boolean } | null>('/me/verification')
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status || status.verified) return null;

  async function resend() {
    setPending(true);
    try {
      await apiFetch('/auth/resend-verification', { method: 'POST' });
      setSent(true);
    } catch {
      // Cicho: to wygoda, nie ścieżka krytyczna. Konto działa bez potwierdzenia,
      // więc nie ma po co straszyć błędem na wejściu do panelu.
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card verify-banner">
      <h3>Potwierdź adres e-mail</h3>
      {sent ? (
        <p className="muted">
          Wysłaliśmy nowy link na <strong>{status.email}</strong>. Sprawdź skrzynkę, także folder
          spam.
        </p>
      ) : (
        <>
          <p className="muted">
            Na <strong>{status.email}</strong> czeka link aktywacyjny. Potwierdzenie adresu sprawia,
            że możemy Cię odzyskać, gdy zapomnisz hasła.
          </p>
          <button className="btn secondary" onClick={() => void resend()} disabled={pending}>
            {pending ? 'Wysyłanie…' : 'Wyślij link ponownie'}
          </button>
        </>
      )}
    </div>
  );
}

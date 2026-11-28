'use client';

// Formularze wątków V17. Te same wywołania API co dzisiejsze reply-form.tsx / thread-actions.tsx.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

import { Info, Pole } from './formy';
import { Ico } from './ico';

const komunikatBledu = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.';

export function OdpowiedzForm({
  sciezka,
  etykieta,
  podpowiedz,
}: {
  sciezka: string;
  etykieta: string;
  podpowiedz: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const body = new FormData(formEl).get('body');
    setError(null);
    setPending(true);
    try {
      await apiFetch(sciezka, { method: 'POST', body: JSON.stringify({ body }) });
      // Czyścimy dopiero po sukcesie — przy błędzie sieci treść zostaje w polu.
      formEl.reset();
      router.refresh();
    } catch (err) {
      setError(komunikatBledu(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="odp" onSubmit={onSubmit}>
      <Pole id="body" etykieta={etykieta} blad={error}>
        <textarea
          id="body"
          name="body"
          rows={3}
          placeholder={podpowiedz}
          required
          minLength={1}
          maxLength={5000}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'body-e' : undefined}
        />
      </Pole>
      <div className="rzad">
        <small>Do 5000 znaków. Druga strona dostanie powiadomienie.</small>
        <button className="vbtn glowny" type="submit" disabled={pending}>
          <Ico n="paper-plane-right" />
          {pending ? 'Wysyłanie…' : 'Wyślij'}
        </button>
      </div>
    </form>
  );
}

export function ZapytanieDalej({
  inquiryId,
  isCompany,
}: {
  inquiryId: string;
  isCompany: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function convert() {
    setPending(true);
    setError(null);
    try {
      const res = await apiFetch<{ orderId: string }>(`/inquiries/${inquiryId}/convert`, {
        method: 'POST',
      });
      router.push(`/zlecenia/${res.orderId}`);
    } catch (err) {
      setError(komunikatBledu(err));
      setPending(false);
    }
  }

  async function close() {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/inquiries/${inquiryId}/close`, { method: 'POST' });
      router.refresh();
    } catch (err) {
      setError(komunikatBledu(err));
      setPending(false);
    }
  }

  return (
    <section className="fm-karta">
      <h2>Co dalej</h2>
      {error ? (
        <Info ikona="warning-circle" rodzaj="zle">
          {error}
        </Info>
      ) : null}
      {isCompany ? (
        <>
          <button
            className="vbtn obrys"
            type="button"
            disabled={pending}
            onClick={() => void convert()}
          >
            <Ico n="clipboard-text" />
            Przekształć w zlecenie
          </button>
          <p style={{ marginTop: 8 }}>
            Powstanie szkic zlecenia: tytuł i branża z usługi, budżet z cen pakietów, w opisie
            pierwsza wiadomość. Opublikujesz go po sprawdzeniu.
          </p>
        </>
      ) : null}
      <button className="vbtn grozny" type="button" disabled={pending} onClick={() => void close()}>
        <Ico n="x-circle" />
        Zamknij wątek
      </button>
      <p style={{ marginTop: 8 }}>Zamkniętego wątku nie można otworzyć ponownie.</p>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { apiFetch } from '@/lib/api';

type Stan = 'pending' | 'done' | 'failed';

export function UnsubscribeClient() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [stan, setStan] = useState<Stan>('pending');
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

  if (stan === 'pending') return <p className="muted">Wypisuję…</p>;

  if (stan === 'done') {
    return (
      <>
        <p>
          <span className="badge success">Gotowe</span> Nie będziemy już wysyłać Ci dziennego
          podsumowania powiadomień.
        </p>
        <p className="muted">
          Zmienisz zdanie? Włączysz je z powrotem w <Link href="/panel/konto">panelu konta</Link>.
          Maile o resecie hasła i weryfikacji adresu działają dalej — to nie subskrypcja.
        </p>
      </>
    );
  }

  return (
    <>
      <p>
        <span className="badge warning">Ten link nie zadziałał</span>
      </p>
      <p className="muted">
        Link mógł być niekompletny (niektóre programy pocztowe ucinają adresy). Powiadomienia e-mail
        wyłączysz też ręcznie w <Link href="/panel/konto">panelu konta</Link>.
      </p>
    </>
  );
}

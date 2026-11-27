'use client';

import Link from 'next/link';

import { useWypis } from '@/lib/use-wypis';

export function UnsubscribeClient() {
  const stan = useWypis();

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

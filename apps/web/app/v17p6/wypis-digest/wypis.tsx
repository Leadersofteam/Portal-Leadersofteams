'use client';

import Link from 'next/link';

import { StanIkona } from '@/components/v17p6/czesci';
import { useWypis } from '@/lib/use-wypis';
import type { StanWypisu } from '@/lib/use-wypis';

export function WypisV17() {
  const stan = useWypis();

  // Stały kontener: czytnik ekranu ogłasza wynik, który zastępuje „Wypisuję…”.
  return (
    <div aria-live="polite">
      <Wynik stan={stan} />
    </div>
  );
}

function Wynik({ stan }: { stan: StanWypisu }) {
  if (stan === 'pending') return <Czekanie />;

  if (stan === 'done') {
    return (
      <>
        <StanIkona ikona="check-circle" rodzaj="p-ok" />
        <h1>Powiadomienia e-mail</h1>
        <p>
          <b>Gotowe.</b> Nie będziemy już wysyłać Ci dziennego podsumowania powiadomień.
        </p>
        <p className="cicho">
          Zmienisz zdanie? Włączysz je z powrotem w <Link href="/panel/konto">panelu konta</Link>.
          Maile o resecie hasła i weryfikacji adresu działają dalej — to nie subskrypcja.
        </p>
      </>
    );
  }

  return (
    <>
      <StanIkona ikona="link-break" rodzaj="zle" />
      <h1>Powiadomienia e-mail</h1>
      <p>
        <b>Ten link nie zadziałał</b>
      </p>
      <p className="cicho">
        Link mógł być niekompletny (niektóre programy pocztowe ucinają adresy). Powiadomienia e-mail
        wyłączysz też ręcznie w <Link href="/panel/konto">panelu konta</Link>.
      </p>
    </>
  );
}

export function Czekanie() {
  return (
    <>
      <h1>Powiadomienia e-mail</h1>
      <p className="cicho" role="status">
        Wypisuję…
      </p>
      <span className="sz m" style={{ width: '80%', height: 14 }} aria-hidden="true" />
    </>
  );
}

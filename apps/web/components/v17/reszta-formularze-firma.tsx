'use client';

// /firma/nowa (makieta p1b: firmaNowa). Wywołanie API — to samo, co w app/firma/nowa/page.tsx.
import { isValidNip } from '@lot/contracts';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

import { Info, Pole } from './formy';
import { kontrolka, skupBlad, skupPasek } from './reszta-formularze';
import { Wstecz } from './rynek';

export function FirmaFormularz() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [bledy, setBledy] = useState<{ nazwa?: string; nip?: string }>({});
  const [blad, setBlad] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBlad(null);
    const form = new FormData(event.currentTarget);
    const nazwa = String(form.get('name') ?? '');
    const nip = String(form.get('nip') ?? '').trim();
    const b: { nazwa?: string; nip?: string } = {};
    if (nazwa.trim().length < 2) b.nazwa = 'Nazwa firmy: min. 2 znaki';
    if (nip && !/^\d{10}$/.test(nip)) b.nip = 'NIP musi składać się z 10 cyfr';
    else if (nip && !isValidNip(nip)) b.nip = 'Błędna suma kontrolna — sprawdź numer';
    setBledy(b);
    if (b.nazwa || b.nip) {
      skupBlad(formRef.current);
      return;
    }
    setPending(true);
    try {
      await apiFetch('/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: nazwa,
          ...(nip ? { nip } : {}),
          ...(form.get('description') ? { description: form.get('description') } : {}),
        }),
      });
      router.push('/zlecenia/nowe');
      router.refresh();
    } catch (err) {
      setBlad(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      skupPasek(formRef.current);
      setPending(false);
    }
  }

  const ileBledow = [bledy.nazwa, bledy.nip].filter(Boolean).length;

  return (
    <div className="fm">
      <div className="fm-gl">
        <Wstecz href="/zlecenia">Zlecenia</Wstecz>
        <h1>Dodaj firmę</h1>
        <p>
          Rejestracja firmy jest otwarta — bez weryfikacji na starcie. Wiarygodność firmy budują
          oceny Liderów po zrealizowanych zleceniach.
        </p>
      </div>
      <div className="fm-t">
        {blad || ileBledow ? (
          <Info ikona="warning-circle" rodzaj="zle">
            <b>Nie utworzyliśmy firmy.</b>{' '}
            {blad ?? (ileBledow > 1 ? 'Popraw zaznaczone pola.' : 'Popraw zaznaczone pole.')}
          </Info>
        ) : null}
        <form
          ref={formRef}
          onSubmit={onSubmit}
          onChange={(e) => {
            const pole = (e.target as unknown as HTMLInputElement).id;
            if (pole === 'nazwa' || pole === 'nip') setBledy((b) => ({ ...b, [pole]: undefined }));
          }}
          noValidate
        >
          <div className="fs">
            <Pole id="nazwa" etykieta="Nazwa firmy" licznik="od 2 do 120 znaków" blad={bledy.nazwa}>
              <input
                {...kontrolka('nazwa', bledy.nazwa)}
                name="name"
                type="text"
                autoComplete="organization"
                required
                maxLength={120}
              />
            </Pole>
            <Pole
              id="nip"
              etykieta="NIP"
              licznik="opcjonalnie"
              blad={bledy.nip}
              pomoc="Z poprawnym numerem przy firmie pojawi się znak „NIP — suma kontrolna OK”. Samego numeru nie pokazujemy."
            >
              <input
                {...kontrolka('nip', bledy.nip)}
                name="nip"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="10 cyfr, bez kresek"
              />
            </Pole>
            <Pole id="opis" etykieta="Krótki opis" licznik="opcjonalnie, do 2000 znaków">
              <textarea id="opis" name="description" rows={4} maxLength={2000} />
            </Pole>
          </div>
          <div className="fm-pasek">
            <span className="sp" />
            <button className="vbtn glowny" type="submit" disabled={pending}>
              {pending ? 'Tworzenie…' : 'Utwórz firmę'}
            </button>
          </div>
        </form>
      </div>
      <aside className="fm-bok">
        <section className="fm-karta">
          <h2>Co zobaczą Liderzy</h2>
          <p>
            <b>Nazwę, opis, zlecenia i oceny.</b> Historia buduje się sama: opublikowane zlecenia,
            potem oceny w obie strony.
          </p>
        </section>
        <section className="fm-karta">
          <h2>Co dalej</h2>
          <p>Po utworzeniu firmy przejdziesz do nowego zlecenia.</p>
        </section>
      </aside>
    </div>
  );
}

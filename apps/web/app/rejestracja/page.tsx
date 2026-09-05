'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';
import { ArtSummitLantern } from '@/components/ui/illustrations';
import { prepareHumancheck, waitForHumancheck } from '@/lib/humancheck';
import type { PreparedHumancheck } from '@/lib/humancheck';

// Bramka człowieka (R-03/R-13) — WŁASNA, bez Cloudflare i bez żadnego dostawcy
// po API. Nie ma tu widgetu do klikania ani obrazków do przepisywania: zagadkę
// liczy przeglądarka w tle, gdy człowiek wypełnia formularz. Dla użytkownika
// bramka jest NIEWIDOCZNA — i to jest jej największa zaleta nad captchą,
// szczególnie dla osób korzystających z czytników ekranu.
// Szczegóły mechanizmu: apps/api/src/shared/humancheck.ts

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Rozwiązanie trzymamy w ref, nie w state: jego zmiana nie ma nic
  // przerysowywać, a przerysowanie formularza w trakcie pisania gubiłoby fokus.
  const prepared = useRef<PreparedHumancheck | null>(null);
  const solving = useRef<Promise<PreparedHumancheck | null> | null>(null);
  // PL2 „Firma w 90 sekund": `?cel=firma` dokłada JEDNO pole (nazwa firmy) i
  // zakłada konto razem z firmą; `?dalej=zlecenie` wraca do formularza potrzeby,
  // w którym czeka szkic z sessionStorage. Czytane po montażu (brak Suspense
  // wokół useSearchParams w tym drzewie) — do pierwszego renderu formularz jest
  // zwykły, więc nic nie mignie poza jednym dodatkowym polem.
  const [celFirma, setCelFirma] = useState(false);
  const [dalejZlecenie, setDalejZlecenie] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCelFirma(params.get('cel') === 'firma');
    setDalejZlecenie(params.get('dalej') === 'zlecenie');
  }, []);

  useEffect(() => {
    // Start liczenia natychmiast po wejściu na stronę. Zanim ktokolwiek wpisze
    // e-mail i hasło, wynik jest gotowy — koszt bramki wynosi dla niego 0 s.
    solving.current = prepareHumancheck()
      .then((result) => {
        prepared.current = result;
        return result;
      })
      .catch(() => null);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    // Gdyby ktoś zdążył wysłać formularz szybciej, niż policzyła się zagadka —
    // czekamy na trwające liczenie zamiast wysyłać żądanie bez rozwiązania.
    if (!prepared.current && solving.current) await solving.current;
    // …a jeśli wypełnił go szybciej niż w 2 s (autouzupełnianie, Enter, test
    // automatyczny), doczekujemy próg zamiast pokazywać mu błąd o automacie.
    await waitForHumancheck(prepared.current);
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          displayName: form.get('displayName'),
          // Pole-pułapka: człowiek go nie widzi, więc zawsze przyjdzie puste.
          nazwaFirmy: form.get('nazwaFirmy') ?? '',
          ...(celFirma && form.get('companyName')
            ? { companyName: form.get('companyName'), intent: 'COMPANY' }
            : {}),
          ...(prepared.current?.solution ? { humancheck: prepared.current.solution } : {}),
        }),
      });
      // Świeże konto trafia do kreatora, nie do pustego panelu — na pustym
      // rynku pierwsze „co teraz?" kosztuje nas użytkownika. Kreator jest
      // w całości pomijalny (patrz app/start/wizard.tsx). Wyjątek (PL2): Firma,
      // która przyszła z formularza potrzeby, wraca do niego — kreator pytałby
      // o to, co już wiadomo.
      router.push(dalejZlecenie ? '/zlecenia/nowe' : '/start');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak. Spróbuj ponownie.',
      );
      setPending(false);
    }
  }

  return (
    <main>
      {/* ≥1024 px: obok formularza cicha kolumna z latarnią szczytu — jedno
          zdanie o tym, PO CO jest to konto. Zero nowych pól, zero frykcji;
          na telefonie kolumna znika i formularz zostaje pierwszy. */}
      <div className="auth-split">
        <div className="card form-card">
          <h1>{celFirma ? 'Konto i firma — jeden krok' : 'Załóż konto'}</h1>
          <p className="muted">
            {celFirma
              ? 'Twój opis potrzeby czeka w tej karcie. Załóż konto, podaj nazwę firmy — i wracasz do zlecenia.'
              : 'Rejestracja jest otwarta dla każdego. Tytuł Lidera zdobywa się pracą i mentoringiem — w Drabince Lidera.'}
          </p>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="displayName">Imię i nazwisko (lub nazwa)</label>
              <input id="displayName" name="displayName" required minLength={2} maxLength={80} />
            </div>
            {celFirma && (
              <div className="field">
                <label htmlFor="companyName">Nazwa firmy</label>
                <input
                  id="companyName"
                  name="companyName"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="organization"
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Hasło (min. 10 znaków)</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
              />
            </div>
            {/* POLE-PUŁAPKA na automaty wypełniające wszystkie inputy. Ukryte
              przed wzrokiem I przed czytnikami ekranu (aria-hidden + tabIndex),
              żeby nie zmyliło osoby korzystającej z klawiatury. Nazwa jest
              celowo wiarygodna — „honeypot" w atrybucie zdradzałby zasadzkę. */}
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="nazwaFirmy">Nazwa firmy (nie wypełniaj)</label>
              <input
                id="nazwaFirmy"
                name="nazwaFirmy"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <button className="btn full" type="submit" disabled={pending}>
              {pending ? 'Tworzenie konta…' : 'Utwórz konto'}
            </button>
          </form>
          <p className="muted">
            Masz już konto? <Link href="/logowanie">Zaloguj się</Link>
          </p>
        </div>
        <aside className="auth-aside">
          <ArtSummitLantern className="auth-aside-art" />
          <p>
            Konto to pierwszy szczebel. Dalej wspinasz się już tylko pracą — każdy punkt w Drabince
            ma jawne źródło, a bursztyn szczytu trzeba zdobyć.
          </p>
        </aside>
      </div>
    </main>
  );
}

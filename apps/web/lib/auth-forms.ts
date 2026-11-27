'use client';

// Logika formularzy logowania, rejestracji i hasła — jedno źródło dla dzisiejszego wyglądu i V17 P5.
// Dwie kopie rozjechałyby się na bramce człowieka albo na `?next=`.
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';
import { prepareHumancheck, waitForHumancheck } from '@/lib/humancheck';
import type { PreparedHumancheck } from '@/lib/humancheck';

export function useLogowanie() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      // `?next=/ścieżka` — powrót tam, skąd gość przyszedł (np. „Zapytaj o pakiet” na usłudze). Wyłącznie ścieżka
      // względna w obrębie Portalu: `//host` i `/\\host` odpadają (open redirect). Bez parametru — jak dotąd /panel.
      // window.location zamiast useSearchParams: hook wymusiłby Suspense i zmienił prerender strony logowania.
      const next = new URLSearchParams(window.location.search).get('next');
      router.push(next && /^\/[^/\\]/.test(next) ? next : '/panel');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak. Spróbuj ponownie.',
      );
      setPending(false);
    }
  }

  return { error, pending, onSubmit };
}

// Bramka człowieka (R-03/R-13) — WŁASNA, bez Cloudflare i bez żadnego dostawcy
// po API. Nie ma tu widgetu do klikania ani obrazków do przepisywania: zagadkę
// liczy przeglądarka w tle, gdy człowiek wypełnia formularz. Dla użytkownika
// bramka jest NIEWIDOCZNA — i to jest jej największa zaleta nad captchą,
// szczególnie dla osób korzystających z czytników ekranu.
// Szczegóły mechanizmu: apps/api/src/shared/humancheck.ts

export function useRejestracja() {
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

  return { error, pending, onSubmit, celFirma, dalejZlecenie };
}

export function useProsbaOHaslo() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await apiFetch('/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email') }),
      });
    } catch {
      // Celowo połykamy błąd: patrz komentarz przy komunikacie niżej.
    } finally {
      setPending(false);
      setSent(true);
    }
  }

  return { sent, pending, onSubmit };
}

export function useNoweHaslo() {
  const [token, setToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Czy adres został już odczytany — przed efektem `token === null` jeszcze nic nie znaczy. */
  const [odczytany, setOdczytany] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token'));
    setOdczytany(true);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const repeat = String(form.get('password2') ?? '');

    // Powtórzenie sprawdzamy TYLKO na froncie: to ochrona przed literówką,
    // nie reguła bezpieczeństwa, więc nie ma po co obciążać nią kontraktu API.
    if (password !== repeat) {
      setError('Hasła nie są takie same.');
      return;
    }
    setError(null);
    setPending(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : 'Nie udało się ustawić hasła. Spróbuj ponownie.',
      );
    } finally {
      setPending(false);
    }
  }

  return { token, odczytany, done, error, pending, onSubmit };
}

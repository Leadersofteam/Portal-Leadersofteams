'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

type State = 'sprawdzam' | 'ok' | 'zly-token' | 'brak-tokenu' | 'blad';

/**
 * Strona z linku aktywacyjnego w e-mailu.
 *
 * DO S15 TEJ STRONY NIE BYŁO — e-mail prowadził pod `/weryfikacja?token=…`,
 * czyli w 404. Backend (`POST /auth/verify-email`) był gotowy i przetestowany
 * od dawna; brakowało wyłącznie ekranu. Lekcja zapisana w GO-LIVE-CHECKLIST:
 * „mail wychodzi" to NIE to samo co „przepływ działa" — trzeba kliknąć link.
 *
 * Każdy stan ma własny komunikat, bo token jest jednorazowy i wygasa po dobie.
 * Jedno ogólne „coś poszło nie tak" zostawiałoby człowieka bez pojęcia, czy ma
 * poprosić o nowy link, czy po prostu jest już aktywny.
 *
 * S19 pkt 4: przy wygasłym linku strona kazała się ZALOGOWAĆ — także komuś,
 * kto był już zalogowany. Dla niego to instrukcja nie do wykonania, a nowy
 * link wisiał dwa ekrany dalej, w banerze panelu. Zalogowanemu podajemy więc
 * ponowną wysyłkę tutaj. Wylogowanemu NIE dajemy formularza z adresem: to
 * otwierałoby enumerację kont, a droga „zaloguj się → baner" jest krótka
 * i już działa.
 */
export default function VerifyEmailPage() {
  const [state, setState] = useState<State>('sprawdzam');
  const [zalogowany, setZalogowany] = useState<boolean | null>(null);
  const [wyslane, setWyslane] = useState(false);
  const [wysylam, setWysylam] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Token jest JEDNORAZOWY. React w trybie deweloperskim montuje efekty
    // dwukrotnie, więc bez tej blokady drugie wywołanie zużywałoby już zużyty
    // token i pokazywało błąd po udanej aktywacji.
    if (started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setState('brak-tokenu');
      return;
    }
    apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
      .then((res) => {
        setState((res as { verified?: boolean }).verified ? 'ok' : 'zly-token');
      })
      .catch((err) => {
        setState(err instanceof ApiRequestError && err.status < 500 ? 'zly-token' : 'blad');
      });
  }, []);

  // Kto na to patrzy — gość czy zalogowany? Od tego zależy, czy w ogóle mamy
  // czym wysłać nowy link (endpoint bierze użytkownika z sesji, nie z pola).
  useEffect(() => {
    apiFetch<{ user: { id: string } | null }>('/auth/me')
      .then((res) => setZalogowany(Boolean(res?.user)))
      .catch(() => setZalogowany(false));
  }, []);

  async function wyslijNowyLink() {
    setWysylam(true);
    try {
      await apiFetch('/auth/resend-verification', { method: 'POST' });
      setWyslane(true);
    } catch {
      // Cicho, jak w banerze panelu: konto działa bez potwierdzenia, więc
      // nieudana wygoda nie ma prawa wyglądać na awarię konta.
    } finally {
      setWysylam(false);
    }
  }

  return (
    <main>
      <div className="card form-card">
        <h1>Potwierdzenie adresu e-mail</h1>

        {state === 'sprawdzam' && <p className="muted">Sprawdzamy link…</p>}

        {state === 'ok' && (
          <>
            <p>Gotowe — Twój adres e-mail jest potwierdzony.</p>
            <p>
              <Link className="btn" href="/panel">
                Przejdź do panelu
              </Link>
            </p>
          </>
        )}

        {state === 'zly-token' && (
          <>
            <div className="error-box">Ten link jest nieprawidłowy, już zużyty albo wygasł.</div>
            {wyslane ? (
              <p className="muted">
                Wysłaliśmy nowy link na Twój adres. Sprawdź skrzynkę, także folder spam.
              </p>
            ) : zalogowany ? (
              <>
                <p className="muted">
                  Link aktywacyjny działa raz i traci ważność po dobie. Jesteś zalogowany, więc nowy
                  link wyślemy od ręki.
                </p>
                <p>
                  <button className="btn" onClick={() => void wyslijNowyLink()} disabled={wysylam}>
                    {wysylam ? 'Wysyłanie…' : 'Wyślij nowy link'}
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className="muted">
                  Link aktywacyjny działa raz i traci ważność po dobie. Jeśli konto jest już
                  aktywne, po prostu się zaloguj. Jeśli nie — zaloguj się, a poprosimy Cię o
                  wysłanie nowego linku.
                </p>
                <p>
                  <Link className="btn" href="/logowanie">
                    Zaloguj się
                  </Link>
                </p>
              </>
            )}
          </>
        )}

        {state === 'brak-tokenu' && (
          <>
            <div className="error-box">W adresie zabrakło tokenu.</div>
            <p className="muted">
              Otwórz link dokładnie tak, jak przyszedł w wiadomości — niektóre programy pocztowe
              obcinają długie adresy. Możesz też skopiować go i wkleić w pasek przeglądarki.
            </p>
          </>
        )}

        {state === 'blad' && (
          <>
            <div className="error-box">Nie udało się teraz potwierdzić adresu.</div>
            <p className="muted">
              To wygląda na chwilowy problem po naszej stronie, nie na błędny link. Spróbuj
              odświeżyć stronę za chwilę.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

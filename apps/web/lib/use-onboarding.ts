'use client';

// Logika kreatora /start — wspólna dla dzisiejszego wyglądu i V17 P6.
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export type Intent = 'LEADER' | 'COMPANY' | 'BOTH';

export const INTENTS: Array<{ value: Intent; title: string; hint: string }> = [
  {
    value: 'LEADER',
    title: 'Jestem Liderem',
    hint: 'Prowadzę zespoły albo wykonuję projekty. Chcę pokazać, co potrafię, i dostawać zlecenia.',
  },
  {
    value: 'COMPANY',
    title: 'Reprezentuję Firmę',
    hint: 'Szukam ludzi do konkretnej roboty. Chcę opisać potrzebę i dostać oferty.',
  },
  {
    value: 'BOTH',
    title: 'Jedno i drugie',
    hint: 'Czasem zlecam, czasem realizuję. Chcę mieć obie strony w jednym koncie.',
  },
];

export type OnboardingArt = 'rung' | 'search' | 'ladder' | 'lantern';

export function useOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [industryId, setIndustryId] = useState('');
  const [headline, setHeadline] = useState('');
  const [companyName, setCompanyName] = useState('');

  async function patch(payload: Record<string, unknown>) {
    try {
      await apiFetch('/me/onboarding', { method: 'PATCH', body: JSON.stringify(payload) });
    } catch {
      // Stan kreatora to komfort — jego zapis nigdy nie może zablokować drogi
      // dalej. Użytkownik ma iść do przodu nawet, gdy zapis się nie uda.
    }
  }

  async function finish() {
    await patch({ completed: true });
    router.push('/panel');
    router.refresh();
  }

  async function chooseIntent(value: Intent) {
    setIntent(value);
    setStep(2);
    await patch({ intent: value, step: 2 });
  }

  async function saveProfile() {
    setError(null);
    setPending(true);
    try {
      if (intent !== 'COMPANY') {
        // Komunikat per pole (wyprawa 22.08): zbiorcze „wybierz branżę i napisz…"
        // kazało sprawdzać także to, co już było wypełnione — dwa razy wyszło
        // w dzienniku wyprawy jako „szukałem błędu, którego nie było".
        if (!industryId) {
          setError('Wybierz branżę / kompetencję.');
          return;
        }
        if (headline.trim().length < 5) {
          setError('Napisz jedno zdanie o sobie (min. 5 znaków).');
          return;
        }
        await apiFetch('/me/leader-profile', {
          method: 'POST',
          body: JSON.stringify({ industryId, headline: headline.trim(), isVisible: true }),
        });
      }
      if (intent !== 'LEADER') {
        if (companyName.trim().length < 2) {
          setError('Podaj nazwę firmy.');
          return;
        }
        await apiFetch('/companies', {
          method: 'POST',
          body: JSON.stringify({ name: companyName.trim() }),
        });
      }
      setStep(3);
      await patch({ step: 3 });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się zapisać.');
    } finally {
      setPending(false);
    }
  }

  // Ikona (`art`) dobrana do ZNACZENIA ruchu (rejestr ART, ADR-009): „rung" =
  // wolne miejsce, które możesz zająć; „search" = szukasz dopasowania;
  // „lantern" = mentoring, czyli światło dla kogoś innego.
  const firstActions: Array<{ href: string; label: string; art: OnboardingArt }> =
    intent === 'COMPANY'
      ? [
          { href: '/zlecenia/nowe', label: 'Opisz pierwsze zlecenie', art: 'rung' },
          { href: '/liderzy', label: 'Przejrzyj katalog Liderów', art: 'search' },
          { href: '/uslugi', label: 'Zobacz gotowe usługi', art: 'ladder' },
        ]
      : [
          // 25.11: profil pierwszy — Firma wybiera Lidera po profilu, a pusty profil
          // przy ofercie przegrywa, zanim ktokolwiek oceni pracę.
          { href: '/panel/profil', label: 'Uzupełnij profil, który zobaczą Firmy', art: 'ladder' },
          { href: '/zlecenia', label: 'Znajdź zlecenie dla siebie', art: 'search' },
          { href: '/pytania', label: 'Odpowiedz na pytanie innego Lidera', art: 'lantern' },
        ];

  return {
    step,
    intent,
    error,
    pending,
    industryId,
    setIndustryId,
    headline,
    setHeadline,
    companyName,
    setCompanyName,
    patch,
    finish,
    chooseIntent,
    saveProfile,
    firstActions,
    router,
  };
}

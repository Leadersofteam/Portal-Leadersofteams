'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiFetch } from '@/lib/api';

export interface StartStep {
  done: boolean;
  label: string;
  hint: string;
  href: string;
}

/**
 * „Zacznij tutaj" — mapa pierwszych kroków dla świeżego konta.
 *
 * ŚWIADOMIE bez żadnej nagrody: odhaczony krok tylko gaśnie. Nie ma punktów za
 * uzupełnienie profilu ani za pierwszą publikację, bo punkt w Portalu może
 * przyznać wyłącznie drugi człowiek za realną pracę (ADR-004). Copy tej sekcji
 * nie może używać słów „nagroda" ani „zdobądź punkty" — inaczej sami
 * podważamy komunikat ze strony /drabinka.
 */
export function StartHere({ steps }: { steps: StartStep[] }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const done = steps.filter((s) => s.done).length;

  async function dismiss() {
    setHidden(true);
    try {
      await apiFetch('/me/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ dismissChecklist: true }),
      });
      router.refresh();
    } catch {
      // Schowanie listy to komfort, nie operacja krytyczna — jeśli zapis padnie,
      // lista wróci przy następnym wejściu i nic się nie psuje.
    }
  }

  if (hidden) return null;

  return (
    <section className="start-here">
      <div className="start-here-head">
        <h2>Zacznij tutaj</h2>
        <span className="start-here-count">
          {done}/{steps.length}
        </span>
      </div>
      <p className="muted start-here-note">
        To mapa, nie nagroda — punkty w Drabince pochodzą wyłącznie ze zrealizowanych zleceń i
        uznanego mentoringu.
      </p>

      <ol className="start-here-list">
        {steps.map((step) => (
          <li key={step.href} className={step.done ? 'done' : ''}>
            <span className="start-here-mark" aria-hidden="true" />
            <div>
              {step.done ? (
                <strong>{step.label}</strong>
              ) : (
                <Link href={step.href}>
                  <strong>{step.label}</strong>
                </Link>
              )}
              <em>{step.hint}</em>
            </div>
          </li>
        ))}
      </ol>

      <button type="button" className="btn secondary" onClick={() => void dismiss()}>
        Ukryj tę listę
      </button>
    </section>
  );
}

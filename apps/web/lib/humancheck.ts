import type { HumancheckChallenge, HumancheckSolution } from '@lot/contracts';

import { apiFetch } from './api';

// Rozwiązywanie zagadki bramki człowieka po stronie przeglądarki.
//
// Zagadka: serwer podaje `salt`, `target = sha256(salt + n)` i górną granicę n.
// Szukamy n licząc po kolei od zera. Praca jest OGRANICZONA Z GÓRY, więc nikt
// nie utknie na pechowym wyzwaniu — inaczej niż przy „N zer z przodu".
//
// DLACZEGO `crypto.subtle`, a nie własny SHA-256: zmierzone w Chromium na tym
// VPS — subtle ~112 tys. hashy/s, ręcznie napisany synchroniczny ~143 tys./s.
// 28% na operacji trwającej ułamek sekundy nie jest warte pisania i utrzymywania
// własnego prymitywu kryptograficznego. Warunek `crypto.subtle` (bezpieczny
// kontekst) spełniamy wszędzie: HTTPS na produkcji i stagingu, a 127.0.0.1
// i localhost są bezpieczne z definicji.
//
// Efekt uboczny `await` przy każdym haszu jest tu ZALETĄ: pętla oddaje sterowanie
// przeglądarce, więc formularz nie zamarza podczas liczenia.

const encoder = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function solveChallenge(
  challenge: HumancheckChallenge,
): Promise<HumancheckSolution | null> {
  for (let n = 0; n <= challenge.maxNumber; n += 1) {
    if ((await sha256Hex(`${challenge.salt}${n}`)) === challenge.target) {
      return { id: challenge.id, number: n };
    }
  }
  // Nie powinno się zdarzyć (n jest w zakresie), ale wolimy jawny null niż
  // wysłanie rejestracji z rozwiązaniem, którego nie znaleźliśmy.
  return null;
}

// Serwer wymaga, żeby między wydaniem wyzwania a rejestracją minął minimalny
// czas wypełniania formularza (MIN_ELAPSED_MS = 2 s po stronie API). Trzymamy
// tu ten sam próg z zapasem, żeby KLIENT DOCZEKAŁ resztę zamiast dostać błąd.
// Bez tego szybkie wysłanie formularza (autouzupełnianie, Enter, test e2e)
// kończyłoby się komunikatem „to nie automat?" dla najzupełniej realnej osoby.
//
// ⚠️ ODLICZAMY OD ODPOWIEDZI SERWERA, NIE OD WYSŁANIA ŻĄDANIA. Serwer mierzy
// czas od chwili, w której UTWORZYŁ wyzwanie — a to jest PÓŹNIEJ niż moment,
// w którym przeglądarka wysłała zapytanie. Licząc od wysłania, oddawaliśmy
// serwerowi o całą latencję sieci za mało i przy wolniejszym łączu dostawaliśmy
// TOO_FAST mimo poprawnego rozwiązania (złapane przez e2e na obciążonym VPS).
// Chwila odebrania odpowiedzi jest zawsze PO utworzeniu wyzwania, więc liczenie
// od niej jest bezpieczne w drugą stronę.
const MIN_ELAPSED_MS = 2_300;

export interface PreparedHumancheck {
  solution: HumancheckSolution | null;
  /** Znacznik czasu, przed którym nie wolno wysłać rejestracji. */
  notBefore: number;
}

/** Czeka, aż minie minimalny czas od wydania wyzwania (zwykle: wcale). */
export async function waitForHumancheck(prepared: PreparedHumancheck | null): Promise<void> {
  if (!prepared) return;
  const remaining = prepared.notBefore - Date.now();
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

export async function fetchChallenge(): Promise<HumancheckChallenge | null> {
  const res = await apiFetch<{ challenge: HumancheckChallenge | null }>('/auth/challenge', {
    method: 'GET',
  });
  return res.challenge;
}

/**
 * Pobiera wyzwanie i od razu je rozwiązuje. Wołane przy wejściu na formularz,
 * żeby wynik był gotowy zanim człowiek skończy pisać — koszt bramki ma być
 * dla niego niewidoczny.
 */
export async function prepareHumancheck(): Promise<PreparedHumancheck | null> {
  const challenge = await fetchChallenge();
  if (!challenge) return null; // bramka wyłączona po stronie serwera
  const receivedAt = Date.now();
  return { solution: await solveChallenge(challenge), notBefore: receivedAt + MIN_ELAPSED_MS };
}

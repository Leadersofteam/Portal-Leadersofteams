import Link from 'next/link';

import { FIRST_POINT, LEVEL_RULES_FALLBACK } from '@/lib/levels';

// „Twój pierwszy punkt” — jeden blok w trzech miejscach pierwszej mili (landing,
// /start, pusty /panel/punkty). Konkret zamiast hasła: ile, za co i od KOGO.
// Obie drogi kończą się decyzją drugiego człowieka (ADR-004) — dlatego wiersz
// „0 pkt” stoi na widoku, a nie w regulaminie: to on odróżnia nas od MLM.
export function FirstPoint({ compact = false }: { compact?: boolean }) {
  const adept = LEVEL_RULES_FALLBACK[0]!;
  return (
    <section className="first-point" aria-labelledby="first-point-title">
      <h3 id="first-point-title">
        Pierwszy szczebel, {adept.name}, to {adept.pointsRequired} pkt. Dają je tylko inni ludzie.
      </h3>
      <ul className="first-point-paths">
        <li>
          <strong>+{FIRST_POINT.reviewTopPoints} pkt</strong>
          <span>
            Firma ocenia Twoją pracę na 5/5 po zakończonym zleceniu. Jedno takie zlecenie wystarcza
            na {adept.name}a.
          </span>
          {!compact && <Link href="/zlecenia">Znajdź zlecenie →</Link>}
        </li>
        <li>
          <strong>+{FIRST_POINT.answerAcceptedPoints} pkt</strong>
          <span>
            Autor pytania uznaje Twoją odpowiedź w Q&amp;A (do {FIRST_POINT.communityWeeklyCap} pkt
            w 7 dni).
          </span>
          {!compact && <Link href="/pytania">Odpowiedz na pytanie →</Link>}
        </li>
        <li className="first-point-zero">
          <strong>0 pkt</strong>
          <span>za zaproszenia, logowanie, wpisy i obserwujących.</span>
        </li>
      </ul>
      <p className="first-point-note">
        Punkty liczą się do awansu po {FIRST_POINT.maturationDays} dniach.{' '}
        <Link href="/drabinka">Pełne zasady Drabinki</Link>
      </p>
    </section>
  );
}

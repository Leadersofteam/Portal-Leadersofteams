/**
 * Rodzina ilustracji pustych stanów — rysowana w domu (ADR-009: zero stocku).
 *
 * Jeden język: cienka linia, brak wypełnień, wszystko jest drabiną. Bursztyn
 * (--level-7) pojawia się WYŁĄCZNIE jako światło szczytu, nigdy jako dekoracja —
 * to kolor zdobytego statusu, więc nie wolno go rozdawać w ozdobnikach.
 *
 * Wszystkie sceny mają ten sam viewBox i dziedziczą kolor z kontekstu, więc
 * można je mieszać w jednym widoku bez rozjazdu skali.
 */

type ArtProps = { className?: string };

function frame(children: React.ReactNode, className?: string) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `art ${className}` : 'art'}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Pusta drabina — nic tu jeszcze nie ma, ale konstrukcja stoi. */
export function ArtEmptyLadder({ className }: ArtProps) {
  return frame(
    <>
      <path d="M70 128V26M130 128V26" opacity="0.75" />
      <path d="M70 104h60M70 80h60" opacity="0.35" />
      <path d="M70 56h60" opacity="0.18" />
      <circle cx="100" cy="20" r="3" opacity="0.4" />
    </>,
    className,
  );
}

/** Wolny szczebel — miejsce, które czeka, aż ktoś je zajmie. */
export function ArtFreeRung({ className }: ArtProps) {
  return frame(
    <>
      <path d="M70 128V26M130 128V26" opacity="0.7" />
      <path d="M70 110h60M70 86h60" opacity="0.3" />
      <path d="M70 62h60" stroke="var(--level-7)" strokeWidth="2.5" />
      <path d="M100 50v-8M86 54l-5-6M114 54l5-6" stroke="var(--level-7)" opacity="0.55" />
    </>,
    className,
  );
}

/** Latarnia szczytu — cel, po który się wspinasz. */
export function ArtSummitLantern({ className }: ArtProps) {
  return frame(
    <>
      <path d="M60 128h80" opacity="0.4" />
      <path d="M78 128 100 44l22 84" opacity="0.55" />
      <path d="M88 96h24" opacity="0.35" />
      <circle cx="100" cy="34" r="9" stroke="var(--level-7)" strokeWidth="2" />
      <path
        d="M100 16v-8M78 34h-9M131 34h9M84 18l-6-6M116 18l6-6"
        stroke="var(--level-7)"
        opacity="0.5"
      />
    </>,
    className,
  );
}

/** Pusta skrzynka — cisza w powiadomieniach i wiadomościach. */
export function ArtEmptyInbox({ className }: ArtProps) {
  return frame(
    <>
      <rect x="52" y="46" width="96" height="66" rx="8" opacity="0.7" />
      <path d="M52 60l48 30 48-30" opacity="0.45" />
      <path d="M76 30h48" opacity="0.25" />
      <path d="M88 20h24" opacity="0.15" />
    </>,
    className,
  );
}

/** Brak wyników — lupa nad drabiną. */
export function ArtNoResults({ className }: ArtProps) {
  return frame(
    <>
      <path d="M62 122V52M104 122V52" opacity="0.35" />
      <path d="M62 100h42M62 76h42" opacity="0.2" />
      <circle cx="118" cy="58" r="26" opacity="0.75" />
      <path d="M137 77l17 17" opacity="0.75" />
    </>,
    className,
  );
}

export const ART = {
  ladder: ArtEmptyLadder,
  rung: ArtFreeRung,
  lantern: ArtSummitLantern,
  inbox: ArtEmptyInbox,
  search: ArtNoResults,
} as const;

export type ArtName = keyof typeof ART;

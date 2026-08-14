/**
 * Rodzina ikon Portalu — rysowana w domu (ADR-009: zero packów, zero zależności).
 *
 * Język wizualny: wszystko jest drabiną. Szczebel to pozioma kreska, wspinaczka
 * to kreski jedna nad drugą, a najwyższy szczebel bywa bursztynowy — ale TYLKO
 * tam, gdzie mówimy o zdobytym statusie (nigdy jako ozdoba przycisku).
 *
 * Konwencja: 24×24, `stroke="currentColor"`, brak wypełnień poza akcentem.
 * Kolor dziedziczy się z kontekstu, więc ta sama ikona działa w headerze,
 * w dolnym pasku i w stanie aktywnym.
 */

type IconProps = {
  size?: number;
  /** Wariant „wypełniony" dla stanu aktywnego w nawigacji. */
  active?: boolean;
};

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };
}

/** Feed społeczności — trzy szczeble, każdy krótszy im wyżej (perspektywa wspinaczki). */
export function IconFeed({ size = 24, active = false }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 17.5h16" opacity={active ? 1 : 0.55} />
      <path d="M6 12h12" opacity={active ? 1 : 0.8} />
      <path d="M8 6.5h8" />
    </svg>
  );
}

/** Usługi — karta oferty ze szczeblem u góry. */
export function IconServices({ size = 24, active = false }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2.5"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.14 : 0}
      />
      <path d="M7.5 9.5h9" />
      <path d="M7.5 13.5h6" opacity="0.65" />
    </svg>
  );
}

/** Zlecenia — teczka zapotrzebowania Firmy. */
export function IconOrders({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" />
      <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" />
      <path d="M3.5 12.5h17" opacity="0.55" />
    </svg>
  );
}

/** Akcja twórcza — plus wpisany w szczebel. */
export function IconPlus({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)} strokeWidth={2}>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </svg>
  );
}

/** Powiadomienia — dzwonek o sylwetce latarni ze szczytu drabiny. */
export function IconBell({ size = 24, active = false }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14l1.5-2Z"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.14 : 0}
      />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

/** Panel — baza wspinacza: drabina w ramce. */
export function IconPanel({ size = 24, active = false }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect
        x="4"
        y="3.5"
        width="16"
        height="17"
        rx="3"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.14 : 0}
      />
      <path d="M8.5 3.8v16.4M15.5 3.8v16.4" opacity="0.5" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h7" />
    </svg>
  );
}

/** Szukanie. */
export function IconSearch({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8 20 20" />
    </svg>
  );
}

/** Udostępnianie — strzałka wychodząca w górę drabiny. */
export function IconShare({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 15.5V4.5" />
      <path d="M8.2 8.3 12 4.5l3.8 3.8" />
      <path d="M5.5 13v5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-5" />
    </svg>
  );
}

/** „Doceniam" — dłonie podające szczebel wyżej. Nie serce: doceniamy pracę, nie lubimy treści. */
export function IconAppreciate({ size = 24, active = false }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M7 20.5v-6.2c0-.7.3-1.3.9-1.7l3.2-2.3c.5-.4 1.3-.3 1.7.2.4.5.3 1.2-.1 1.6L11 13.5h4.8c1 0 1.9.7 2.1 1.7l.6 3c.2 1.2-.7 2.3-1.9 2.3H7Z"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.16 : 0}
      />
      <path d="M4 13.5h3v7H4z" />
      <path d="M12.5 6.8V3.5" opacity="0.55" />
    </svg>
  );
}

/**
 * Zakładka — półka „na później". Zakładka w książce, nie gwiazdka: gwiazdka
 * mówi „to jest dobre" (ocena dla innych), zakładka mówi „wrócę do tego"
 * (notatka dla siebie). ADR-010: zakładek nikt nie liczy publicznie.
 */
export function IconBookmark({ size = 24, active = false }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M6.5 4.5h11a1 1 0 0 1 1 1v14l-6.5-4-6.5 4v-14a1 1 0 0 1 1-1Z"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.18 : 0}
      />
    </svg>
  );
}

/** Menu — trzy szczeble (spójne z hamburgerem, ale jako ikona w treści). */
export function IconMore({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />
    </svg>
  );
}

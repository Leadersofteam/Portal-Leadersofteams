/**
 * Znak marki Leaders of Teams: drabinka w gradientowym kwadracie.
 * Najwyższy szczebel jest bursztynowy — kolor, który w całym systemie
 * oznacza zdobyty (nie kupiony) status. Jedno źródło prawdy dla headera,
 * stopki i assetów (app/icon.svg jest wersją statyczną tego znaku,
 * scripts/gen-icons.mjs rysuje z tych samych liczb PNG-i PWA).
 *
 * Od 2026-10-20 drabina jest drabiną. Wcześniej trzy równe, zaokrąglone paski
 * czytały się jak ikona menu (≡) — w nagłówku, kilkaset pikseli od prawdziwego
 * przycisku menu. Teraz poręcze zbiegają się ku górze (drabina widziana od
 * dołu, wspinaczka przed tobą), szczeble skracają się z wysokością, a bursztynowy
 * wystaje poza poręcze: ten szczebel się zdobywa, nie dostaje.
 */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="lot-mark-bg"
          x1="0"
          y1="32"
          x2="32"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#5b21b6" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#lot-mark-bg)" />
      <path d="M9.2 26.5 11.4 5.5h1.9l-1.9 21z" fill="#fff" />
      <path d="M22.8 26.5 20.6 5.5h-1.9l1.9 21z" fill="#fff" />
      <rect x="9.78" y="19.7" width="12.45" height="2.6" fill="#fff" />
      <rect x="10.4" y="13.7" width="11.19" height="2.6" fill="#fff" />
      <rect x="9.43" y="7.7" width="13.13" height="2.6" fill="#fbbf24" />
    </svg>
  );
}

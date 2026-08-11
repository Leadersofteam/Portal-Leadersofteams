/**
 * Znak marki Leaders of Teams: drabinka w gradientowym kwadracie.
 * Najwyższy szczebel jest bursztynowy — kolor, który w całym systemie
 * oznacza zdobyty (nie kupiony) status. Jedno źródło prawdy dla headera,
 * stopki i assetów (app/icon.svg jest wersją statyczną tego znaku).
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
        <linearGradient id="lot-mark-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#lot-mark-bg)" />
      <rect x="8" y="7.5" width="16" height="3.2" rx="1.6" fill="#fbbf24" />
      <rect x="8" y="14.4" width="16" height="3.2" rx="1.6" fill="#ffffff" fillOpacity="0.85" />
      <rect x="8" y="21.3" width="16" height="3.2" rx="1.6" fill="#ffffff" fillOpacity="0.5" />
    </svg>
  );
}

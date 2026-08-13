const TIER_LABELS: Record<string, string> = {
  BASIC: 'Podstawowy',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

const plnFormat = new Intl.NumberFormat('pl-PL');

export interface PackageRow {
  tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
  name: string;
  priceDeclared: number;
  deliveryDays: number;
  scope: string;
}

/**
 * Porównywarka pakietów — BEZ JEDNEJ LINII JAVASCRIPTU.
 *
 * Desktop pokazuje wszystkie warianty obok siebie (porównanie wzrokiem to cała
 * wartość). Na telefonie trzy kolumny są nieczytelne, więc pakiety stają się
 * przełącznikiem: ukryte radio + <label> jako zakładka, a widoczność kart
 * rozstrzyga `:has()`. Serwerowy komponent, zero hydracji, działa nawet gdy
 * skrypt się nie wczyta.
 *
 * `@supports not (selector(:has(*)))` zostawia stary WebView ze stosem kart —
 * gorzej, ale nadal użytecznie (nic się nie chowa bezpowrotnie).
 */
export function PackageCompare({ packages }: { packages: PackageRow[] }) {
  if (packages.length === 0) return null;
  const defaultTier = packages.find((p) => p.tier === 'STANDARD')?.tier ?? packages[0]!.tier;

  return (
    <div className="package-compare">
      {packages.length > 1 && (
        <>
          <div className="package-switch" role="tablist" aria-label="Wybierz pakiet">
            {packages.map((pkg) => (
              <div key={pkg.tier} className="package-switch-item">
                <input
                  type="radio"
                  name="pkg"
                  id={`pkg-${pkg.tier}`}
                  defaultChecked={pkg.tier === defaultTier}
                />
                <label htmlFor={`pkg-${pkg.tier}`}>{TIER_LABELS[pkg.tier] ?? pkg.tier}</label>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="package-grid">
        {packages.map((pkg) => (
          <div
            key={pkg.tier}
            data-tier={pkg.tier}
            className={pkg.tier === 'PREMIUM' ? 'package-card premium' : 'package-card'}
          >
            <span className="tier">{TIER_LABELS[pkg.tier] ?? pkg.tier}</span>
            <strong>{pkg.name}</strong>
            <span className="price">{plnFormat.format(pkg.priceDeclared)} zł</span>
            <span className="muted">do {pkg.deliveryDays} dni</span>
            <p className="pre-wrap package-scope">{pkg.scope}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Pas zaufania — jedno miejsce dla „★ 4,7/5 (12) · 8 zrealizowanych zleceń".
 *
 * Wydzielony w S19 pkt 3, gdy ślad zaufania wszedł do wyszukiwarki: do tej pory
 * markup żył wyłącznie w `listing-card.tsx`, a `/szukaj` było JEDYNYM miejscem
 * w Portalu, gdzie wynik nie mówił, czy komuś już zapłacono za pracę.
 *
 * Zasada z PD3 zostaje nietknięta: świeży Lider bez historii nie dostaje ani
 * pustych zer, ani „brak ocen" — cisza zamiast piętna. Dlatego komponent sam
 * decyduje, czy w ogóle się renderować (`hasTrust`), a wołający nie musi tego
 * powtarzać.
 */
export interface TrustFacts {
  averageRating: number | null;
  reviewCount: number;
  completedOrders: number;
}

// Polska liczba mnoga: 1 zlecenie / 2–4 zlecenia / 5+ zleceń (z wyjątkiem 12–14).
export function odmienZlecenia(n: number): string {
  if (n === 1) return 'zrealizowane zlecenie';
  const d = n % 10;
  const h = n % 100;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'zrealizowane zlecenia';
  return 'zrealizowanych zleceń';
}

export function hasTrust(facts: TrustFacts): boolean {
  return facts.reviewCount > 0 || facts.completedOrders > 0;
}

export function TrustStrip({ facts }: { facts: TrustFacts }) {
  if (!hasTrust(facts)) return null;
  return (
    <p className="trust-strip">
      {facts.reviewCount > 0 && (
        <span className="trust-fact">
          <span aria-hidden="true">★</span> {facts.averageRating}/5
          <span className="muted"> ({facts.reviewCount})</span>
        </span>
      )}
      {facts.completedOrders > 0 && (
        <span className="trust-fact">
          {facts.completedOrders} {odmienZlecenia(facts.completedOrders)}
        </span>
      )}
    </p>
  );
}

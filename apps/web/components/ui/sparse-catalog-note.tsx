import Link from 'next/link';

/**
 * Rzadki katalog (audyt UX 21.10, P10): przy kilku pozycjach formularz filtrów
 * nad 1–3 wynikami wyglądał jak niedokończony szablon. Zamiast filtrować
 * pustkę — mówimy wprost, że rynek rośnie, i dajemy Firmie jedną akcję.
 * Chipy branż ZOSTAJĄ: to linki do hubów (SEO, hub-and-spoke).
 */
export const SPARSE_CATALOG_LIMIT = 6;

export function SparseCatalogNote({ children }: { children: string }) {
  return (
    <aside className="card sparse-note" aria-label="Opisz potrzebę">
      <h2>Nie widzisz tego, czego szukasz?</h2>
      <p className="muted">{children}</p>
      <Link className="btn" href="/zlecenia/nowe">
        Opisz potrzebę
      </Link>
    </aside>
  );
}

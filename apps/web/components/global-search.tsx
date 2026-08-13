import { IconSearch } from '@/components/ui/icons';

/**
 * Globalne pole wyszukiwania w nagłówku.
 *
 * Zwykły <form action="/szukaj" method="get"> — DZIAŁA BEZ JS. Żadnego
 * podpowiadania na żywo: to katalog pracy, nie wyszukiwarka internetowa,
 * a każde naciśnięcie klawisza kosztowałoby zapytanie FULLTEXT na
 * współdzielonym VPS-ie.
 */
export function GlobalSearch() {
  return (
    <form className="global-search" action="/szukaj" method="get" role="search">
      <label className="sr-only" htmlFor="global-q">
        Szukaj w Portalu
      </label>
      <IconSearch size={18} />
      <input
        id="global-q"
        name="q"
        type="search"
        placeholder="Szukaj usług, Liderów, zleceń…"
        maxLength={80}
        autoComplete="off"
      />
    </form>
  );
}

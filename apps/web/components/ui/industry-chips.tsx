import Link from 'next/link';

// Chipy branż jako NAWIGACJA do hubów (PL4). Ranking wolno stosować tylko do
// etykiet (ADR-010) — kolejność alfabetyczna z API, żaden chip nie jest
// „polecany". Linki zwykłe, więc działają bez JS i są widoczne dla crawlerów —
// to one spinają huby z listami głównymi (hub-and-spoke).
export interface IndustryLink {
  id: string;
  name: string;
  slug: string;
}

export function IndustryChips({
  industries,
  base,
  activeSlug,
  allHref,
}: {
  industries: IndustryLink[];
  /** `/uslugi` | `/zlecenia` | `/liderzy` */
  base: string;
  activeSlug?: string;
  /** Adres „wszystkie" — zwykle lista główna. */
  allHref: string;
}) {
  if (industries.length === 0) return null;
  return (
    <ul className="tag-chips" aria-label="Branże">
      <li>
        <Link className={activeSlug ? 'tag-chip' : 'tag-chip active'} href={allHref}>
          Wszystkie branże
        </Link>
      </li>
      {industries.map((i) => (
        <li key={i.id}>
          <Link
            className={activeSlug === i.slug ? 'tag-chip active' : 'tag-chip'}
            href={`${base}/branza/${i.slug}`}
          >
            {i.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

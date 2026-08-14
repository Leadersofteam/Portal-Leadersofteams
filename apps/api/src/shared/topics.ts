// Tematy (#hashtagi) w treściach wpisów i postów w grupach.
//
// Bliźniak `shared/mentions.ts` — ta sama filozofia: wydobywamy z tekstu, nie
// każemy użytkownikowi wypełniać osobnego pola. Front ma lustrzany parser
// w `components/mention-text.tsx`; gdyby się rozjechały, klikalne byłoby coś
// innego niż to, co realnie zapisaliśmy jako temat.
//
// DLACZEGO TO W OGÓLE ISTNIEJE, skoro mamy wyszukiwarkę: `innodb_ft_min_token_size`
// wynosi 3, więc „HR", „AI", „UX" NIGDY nie trafią do indeksu FULLTEXT. Temat
// jest jedyną drogą do tych rozmów — dokładnie tak samo jak tagi w katalogu usług.

// Dopuszczamy polskie znaki i cyfry; wymagamy litery na starcie, żeby „#1"
// czy „#2026" nie stawały się tematami (to zwykle numery, nie kategorie).
const TOPIC_RE = /#([\p{L}][\p{L}\p{N}_-]{1,29})/gu;

/** Limit na treść — antyspam. Nadmiar ignorujemy, nie odrzucamy całej treści. */
export const MAX_TOPICS_PER_CONTENT = 5;

const PL_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

/**
 * Klucz tematu. „#Rekrutacja", „#rekrutacja" i „#REKRUTACJA" to JEDEN temat —
 * inaczej rozmowa rozpadłaby się na warianty pisowni tego samego słowa.
 * Transliteracja polskich znaków z tego samego powodu: „#jakość" i „#jakosc"
 * to dla piszącego to samo.
 */
export function topicSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => PL_MAP[ch] ?? ch)
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

export interface ExtractedTopic {
  /** Pisownia z treści — pokazujemy ją, żeby „#AI" nie stało się „#ai". */
  name: string;
  slug: string;
}

export function extractTopics(text: string): ExtractedTopic[] {
  const bySlug = new Map<string, ExtractedTopic>();
  for (const match of text.matchAll(TOPIC_RE)) {
    const name = match[1]!;
    const slug = topicSlug(name);
    // Slug bywa pusty po transliteracji (np. sam myślnik) — takich nie zapisujemy.
    if (!slug || bySlug.has(slug)) continue;
    bySlug.set(slug, { name, slug });
    if (bySlug.size >= MAX_TOPICS_PER_CONTENT) break;
  }
  return [...bySlug.values()];
}

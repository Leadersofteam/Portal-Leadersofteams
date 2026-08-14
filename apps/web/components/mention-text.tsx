import Link from 'next/link';
import type { ReactNode } from 'react';

// Te same wzorce co po stronie API (`shared/mentions.ts`, `shared/topics.ts`).
// Gdyby się rozjechały, front linkowałby inne uchwyty i tematy niż te, które
// realnie zapisaliśmy — czyli klikalne byłoby coś, czego w bazie nie ma.
const MENTION_RE = /@([a-z0-9][a-z0-9-]{1,29})/gi;
const TOPIC_RE = /#([\p{L}][\p{L}\p{N}_-]{1,29})/gu;

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

/** Lustro `topicSlug` z API — ta sama transliteracja i to samo obcięcie. */
function topicSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => PL_MAP[ch] ?? ch)
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

interface Token {
  start: number;
  end: number;
  node: ReactNode;
}

/**
 * Renderuje treść z klikalnymi wzmiankami @handle, tematami #temat i zachowanymi
 * łamaniami linii.
 *
 * Świadomie NIE parsujemy markdowna ani linków: treść pochodzi od użytkowników,
 * a każdy dodatkowy parser to nowa powierzchnia ataku za zerową wartość.
 */
export function MentionText({ children }: { children: string }) {
  const tokens: Token[] = [];

  for (const match of children.matchAll(MENTION_RE)) {
    const start = match.index ?? 0;
    const handle = match[1]!.toLowerCase();
    tokens.push({
      start,
      end: start + match[0].length,
      node: (
        <Link key={`m-${start}`} href={`/profil/${handle}`} className="mention">
          @{match[1]}
        </Link>
      ),
    });
  }

  for (const match of children.matchAll(TOPIC_RE)) {
    const start = match.index ?? 0;
    const slug = topicSlug(match[1]!);
    // Slug bywa pusty po transliteracji — wtedy zostawiamy zwykły tekst,
    // bo link prowadziłby pod `/tematy/` bez identyfikatora.
    if (!slug) continue;
    tokens.push({
      start,
      end: start + match[0].length,
      node: (
        <Link key={`t-${start}`} href={`/tematy/${slug}`} className="topic-link">
          #{match[1]}
        </Link>
      ),
    });
  }

  // Jedna wspólna oś pozycji: wzmianki i tematy mogą wystąpić w dowolnej
  // kolejności, a dwa niezależne przebiegi po tekście gubiłyby ten wcześniejszy.
  tokens.sort((a, b) => a.start - b.start);

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  for (const token of tokens) {
    if (token.start < lastIndex) continue; // nakładające się dopasowanie — pomijamy
    if (token.start > lastIndex) nodes.push(children.slice(lastIndex, token.start));
    nodes.push(token.node);
    lastIndex = token.end;
  }
  if (lastIndex < children.length) nodes.push(children.slice(lastIndex));

  return <span className="pre-wrap">{nodes}</span>;
}

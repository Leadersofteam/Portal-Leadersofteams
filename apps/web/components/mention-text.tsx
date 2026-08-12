import Link from 'next/link';
import type { ReactNode } from 'react';

// Ten sam wzorzec co apps/api/src/shared/mentions.ts — gdyby się rozjechały,
// front linkowałby inne uchwyty niż te, do których poszły powiadomienia.
const MENTION_RE = /@([a-z0-9][a-z0-9-]{1,29})/gi;

/**
 * Renderuje treść z klikalnymi wzmiankami @handle i zachowanymi łamaniami linii.
 * Świadomie NIE parsujemy markdowna ani linków: treść pochodzi od użytkowników,
 * a każdy dodatkowy parser to nowa powierzchnia ataku za zerową wartość.
 */
export function MentionText({ children }: { children: string }) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of children.matchAll(MENTION_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(children.slice(lastIndex, start));
    const handle = match[1]!.toLowerCase();
    nodes.push(
      <Link key={`${start}-${handle}`} href={`/profil/${handle}`} className="mention">
        @{match[1]}
      </Link>,
    );
    lastIndex = start + match[0].length;
  }
  if (lastIndex < children.length) nodes.push(children.slice(lastIndex));

  return <span className="pre-wrap">{nodes}</span>;
}

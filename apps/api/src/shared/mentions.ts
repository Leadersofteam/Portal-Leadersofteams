// Wzmianki @handle w treściach (posty/komentarze/odpowiedzi). Limit 5 na treść
// (antyspam) — nadmiarowe są ignorowane, nie odrzucamy całej treści.
const MENTION_RE = /@([a-z0-9][a-z0-9-]{1,29})/gi;
export const MAX_MENTIONS_PER_CONTENT = 5;

export function extractMentions(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    found.add(match[1]!.toLowerCase());
    if (found.size >= MAX_MENTIONS_PER_CONTENT) break;
  }
  return [...found];
}

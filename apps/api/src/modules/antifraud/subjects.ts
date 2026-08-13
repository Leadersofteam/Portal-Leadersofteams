// Rozwiązywanie ZGŁOSZONEJ TREŚCI dla moderatora (S12).
//
// Do S12 `/panel/moderacja` pokazywał wyłącznie notatkę zgłaszającego. Moderator
// wiedział, że „coś" zgłoszono, i nie miał jak tego otworzyć ani ukryć — czyli
// jedyny mechanizm reagowania na nadużycia był w praktyce nieużywalny.
//
// Wzorzec jest LUSTREM `AccountDataModule` z RODO (modules/identity/service.ts):
// antifraud nie czyta cudzych tabel (ADR-002). Każdy moduł wnosi implementację
// dla swojego typu treści — sam ją czyta i sam ukrywa.
import type { ReportSubjectType } from '@lot/contracts';

export interface ModerationSubjectPreview {
  /** false = treść już nie istnieje (usunięta przez autora albo przez RODO). */
  exists: boolean;
  /** true = treść jest już niewidoczna (ukryta wcześniej albo skasowana). */
  hidden: boolean;
  title: string | null;
  /** Fragment treści — moderator ma ocenić zgłoszenie bez opuszczania panelu. */
  excerpt: string | null;
  authorUserId: string | null;
  authorDisplayName: string | null;
  /** Kontekst potrzebny frontowi do zbudowania linku (np. post w grupie). */
  context?: { groupId?: string };
}

export interface ModerationSubjectModule {
  readonly subjectType: ReportSubjectType;
  /**
   * Batch, nie pojedynczy odczyt: lista spraw potrafi mieć kilkadziesiąt pozycji
   * tego samego typu, a N+1 na panelu moderatora to dokładnie ten rodzaj kosztu,
   * którego nie widać w testach i widać na produkcji.
   */
  loadMany(ids: string[]): Promise<Map<string, ModerationSubjectPreview>>;
  /**
   * Ukrycie treści. OPCJONALNE — nie każdy typ da się sensownie ukryć
   * (patrz marketplace: zlecenie to umowa dwóch stron, nie publiczna treść).
   * Brak implementacji = panel nie pokaże przycisku, a API odrzuci akcję.
   */
  hide?(id: string, moderatorId: string): Promise<void>;
}

/** Wspólny skrót treści do podglądu — jedna definicja „fragmentu" dla wszystkich modułów. */
export const MODERATION_EXCERPT_LENGTH = 240;

export function excerpt(body: string | null | undefined): string | null {
  if (!body) return null;
  const clean = body.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return null;
  return clean.length > MODERATION_EXCERPT_LENGTH
    ? `${clean.slice(0, MODERATION_EXCERPT_LENGTH)}…`
    : clean;
}

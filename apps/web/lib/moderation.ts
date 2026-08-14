import type { ReportSubjectType } from '@lot/contracts';

export interface ModerationSubject {
  exists: boolean;
  hidden: boolean;
  title: string | null;
  excerpt: string | null;
  authorUserId: string | null;
  authorDisplayName: string | null;
  context?: { groupId?: string };
  canHide: boolean;
}

export interface ModerationCase {
  id: string;
  source: string;
  note: string | null;
  subjectUserId: string | null;
  subjectType: string | null;
  subjectId: string | null;
  reportedByUserId: string | null;
  pointEventId: string | null;
  createdAt: string;
  subject: ModerationSubject | null;
}

const SUBJECT_LABELS: Record<ReportSubjectType, string> = {
  SOCIAL_POST: 'Wpis portalowy',
  POST: 'Post w grupie',
  THREAD: 'Pytanie w grupie',
  ORDER: 'Zlecenie',
};

export function subjectLabel(subjectType: string | null): string {
  if (!subjectType) return 'Sprawa punktowa';
  return SUBJECT_LABELS[subjectType as ReportSubjectType] ?? subjectType;
}

/**
 * Adres zgłoszonej treści. Routing jest wiedzą FRONTU — API zwraca typ, id
 * i kontekst, a nie gotowe ścieżki Next.js. Dzięki temu zmiana adresu strony
 * nie wymaga zmiany w API ani migracji zapisanych spraw.
 */
export function moderationSubjectHref(
  subjectType: string | null,
  subjectId: string | null,
  context?: { groupId?: string },
): string | null {
  if (!subjectType || !subjectId) return null;
  switch (subjectType as ReportSubjectType) {
    case 'SOCIAL_POST':
      return `/wpisy/${subjectId}`;
    case 'THREAD':
      return `/watki/${subjectId}`;
    case 'ORDER':
      return `/zlecenia/${subjectId}`;
    case 'POST':
      // Post w grupie da się otworzyć TYLKO znając grupę. Brak groupId oznacza,
      // że treść już nie istnieje — wtedy lepiej nie dawać linku niż dać taki,
      // który prowadzi w 404.
      return context?.groupId ? `/grupy/${context.groupId}/post/${subjectId}` : null;
    default:
      return null;
  }
}

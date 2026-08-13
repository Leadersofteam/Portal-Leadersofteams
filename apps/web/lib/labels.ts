export const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Szkic',
  PUBLISHED: 'Otwarte na oferty',
  AWARDED: 'Wybrano Lidera',
  IN_PROGRESS: 'W realizacji',
  DELIVERED: 'Dostarczone',
  CONFIRMED: 'Zrealizowane',
  CANCELLED: 'Anulowane',
  DISPUTED: 'Spór',
};

export const OFFER_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Złożona',
  WITHDRAWN: 'Wycofana',
  ACCEPTED: 'Zaakceptowana',
  REJECTED: 'Odrzucona',
};

export function formatBudget(min: number, max: number): string {
  const fmt = new Intl.NumberFormat('pl-PL');
  return min === max ? `${fmt.format(min)} zł` : `${fmt.format(min)}–${fmt.format(max)} zł`;
}

export const GROUP_TYPE_LABELS: Record<string, string> = {
  OPEN: 'Otwarta',
  MODERATED: 'Moderowana',
};

export const POST_TYPE_LABELS: Record<string, string> = {
  DISCUSSION: 'Dyskusja',
  CASE_STUDY: 'Case study',
  IDEA: 'Pomysł',
};

// Q&A / mentoring (moduł community) — druga, punktowana ścieżka awansu.
export const THREAD_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Otwarte',
  ANSWERED: 'Rozwiązane',
  CLOSED: 'Zamknięte',
};

// Powiadomienia in-app: tekst budowany z typu + payloadu (bez PII w payloadzie).
export function notificationMessage(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case 'offer_submitted':
      return 'Nowa oferta do Twojego zlecenia.';
    case 'inquiry_created':
      return `Nowe zapytanie o Twoją usługę${payload.listingTitle ? ` „${payload.listingTitle}"` : ''}.`;
    case 'inquiry_message':
      return 'Nowa wiadomość w zapytaniu o usługę.';
    case 'offer_accepted':
      return 'Twoja oferta została przyjęta.';
    case 'order_confirmed':
      return 'Zlecenie zostało potwierdzone jako zrealizowane.';
    case 'review_received':
      return 'Otrzymałeś nową ocenę.';
    case 'level_achieved':
      return `Awans w Drabince Lidera — poziom ${payload.level ?? ''}.`;
    case 'post_commented':
      return 'Nowy komentarz do Twojego posta.';
    case 'user_mentioned':
      return 'Ktoś wspomniał o Tobie.';
    case 'post_quoted':
      return 'Ktoś podał dalej Twój wpis z własnym komentarzem.';
    case 'membership_requested':
      return 'Nowa prośba o dołączenie do Twojej grupy.';
    case 'membership_accepted':
      return 'Przyjęto Cię do grupy.';
    case 'answer_received':
      return 'Nowa odpowiedź na Twoje pytanie.';
    case 'answer_accepted':
      return 'Twoja odpowiedź została zaakceptowana — punkty w Drabince.';
    default:
      return 'Nowe powiadomienie.';
  }
}

// Cel linku powiadomienia (dane zawsze dociągane REST-em — ADR-007).
export function notificationHref(type: string, payload: Record<string, unknown>): string {
  // Wpis portalowy nie ma grupy — sprawdzamy go PRZED regułami grupowymi,
  // inaczej wzmianka i komentarz lądowałyby na ogólnej liście powiadomień.
  if (payload.socialPostId) return `/wpisy/${payload.socialPostId}`;
  if (type === 'post_commented' && payload.groupId && payload.postId)
    return `/grupy/${payload.groupId}/post/${payload.postId}`;
  if ((type === 'membership_requested' || type === 'membership_accepted') && payload.groupId)
    return `/grupy/${payload.groupId}`;
  if ((type === 'answer_received' || type === 'answer_accepted') && payload.threadId)
    return `/watki/${payload.threadId}`;
  if ((type === 'inquiry_created' || type === 'inquiry_message') && payload.inquiryId)
    return `/zapytania/${payload.inquiryId}`;
  if (payload.orderId) return `/zlecenia/${payload.orderId}`;
  if (type === 'level_achieved') return '/panel/punkty';
  return '/powiadomienia';
}

/**
 * Czas w feedzie: data i godzina bez sekund. Sekundy to czysty szum — nikt nie
 * czyta wpisu z dokładnością co do sekundy, a na 390 px zjadają miejsce
 * potrzebne na nazwę autora i odznakę poziomu.
 */
export function formatFeedTime(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

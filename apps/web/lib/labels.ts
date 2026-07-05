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

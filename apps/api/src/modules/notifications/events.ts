import type { EventHandler } from '../ladder/index';
import type { NotificationsService } from './service';

// Rejestr subskrypcji modułu notifications. W przeciwieństwie do ladder,
// notifications NIE ma ograniczeń prefiksów — powiadomienia są fan-outem po
// wszystkich modułach (marketplace.*, ladder.*, groups.*). To wyłącznie zapis
// Notification + sygnał realtime; ZERO logiki punktowej (anty-MLM nienaruszony).
export function notificationsSubscriptions(
  service: NotificationsService,
): Record<string, EventHandler> {
  return {
    'marketplace.offer_submitted': (p) => service.onOfferSubmitted(p as never),
    'marketplace.inquiry_created': (p) => service.onInquiryCreated(p as never),
    'marketplace.inquiry_message': (p) => service.onInquiryMessage(p as never),
    'marketplace.offer_accepted': (p) => service.onOfferAccepted(p as never),
    // GRANICA ANTY-MLM: wątek przy ofercie (PL1) konsumuje WYŁĄCZNIE
    // notifications — rozmowa nie jest pracą (ladder/subscriptions.test.ts).
    'marketplace.offer_message': (p) => service.onOfferMessage(p as never),
    // Oddanie pracy (PL1): do 04.09 jedyny krok cyklu bez adresata — Firma
    // nie wiedziała, że ma potwierdzić wykonanie.
    'marketplace.order_delivered': (p) => service.onOrderDelivered(p as never),
    'marketplace.order_confirmed': (p) => service.onOrderConfirmed(p as never),
    'marketplace.review_published': (p) => service.onReviewPublished(p as never),
    'ladder.level_achieved': (p) => service.onLevelAchieved(p as never),
    'groups.comment_added': (p) => service.onCommentAdded(p as never),
    'groups.user_mentioned': (p) => service.onUserMentioned(p as never),
    'community.user_mentioned': (p) => service.onUserMentioned(p as never),
    'social.user_mentioned': (p) => service.onUserMentioned(p as never),
    'social.comment_added': (p) => service.onCommentAdded(p as never),
    // GRANICA ANTY-MLM: to zdarzenie konsumuje WYŁĄCZNIE notifications.
    // Cytowanie nie daje punktów — pilnuje tego strukturalny test w social.
    'social.post_quoted': (p) => service.onPostQuoted(p as never),
    'groups.membership_requested': (p) => service.onMembershipRequested(p as never),
    'groups.membership_accepted': (p) => service.onMembershipAccepted(p as never),
    // GRANICA ANTY-MLM: rola moderatora grupy to obowiązek, nie punkty —
    // konsumuje WYŁĄCZNIE notifications (test strukturalny w groups).
    'groups.membership_role_changed': (p) => service.onMembershipRoleChanged(p as never),
    'community.answer_created': (p) => service.onAnswerCreated(p as never),
    'community.answer_accepted': (p) => service.onAnswerAccepted(p as never),
  };
}

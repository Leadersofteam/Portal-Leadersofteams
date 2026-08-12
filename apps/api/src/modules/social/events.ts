import type { EventHandler } from '../ladder/index';
import type { SocialService } from './service';

// Subskrypcje modułu social: materializacja CHRONOLOGICZNEGO feedu z już
// istniejących zdarzeń domenowych (bez fan-outu — NFR 10k/1 VPS).
// UWAGA anty-MLM: to konsument-projekcja. Moduł social sam NIE emituje zdarzeń,
// które mógłby skonsumować ladder; punkty pozostają wyłącznie w marketplace
// (recenzje) i community (mentoring).
export function socialSubscriptions(service: SocialService): Record<string, EventHandler> {
  return {
    'groups.post_published': (p) => service.onPostPublished(p as never),
    'marketplace.listing_published': (p) => service.onListingPublished(p as never),
    'community.answer_accepted': (p) => service.onAnswerAccepted(p as never),
    'ladder.level_achieved': (p) => service.onLevelAchieved(p as never),
  };
}

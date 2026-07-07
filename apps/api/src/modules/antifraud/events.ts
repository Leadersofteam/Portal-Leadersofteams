import type { EventHandler } from '../ladder/index';
import type { AntifraudService, PointPendingPayload } from './service';

export function antifraudSubscriptions(antifraud: AntifraudService): Record<string, EventHandler> {
  return {
    'ladder.point_pending_created': (payload) =>
      antifraud.evaluatePendingPoint(payload as PointPendingPayload),
  };
}

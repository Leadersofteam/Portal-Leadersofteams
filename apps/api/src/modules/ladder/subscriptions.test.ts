// Test architektonicznej granicy anty-MLM (ADR-002 §5, ADR-010 dec. 4):
// ladder może subskrybować wyłącznie zdarzenia marketplace.* i community.*.
// Jeśli ktokolwiek doda subskrypcję groups.*/teams.*/identity.* — ten test
// ma się wywalić i odesłać do ADR-004.
import { describe, expect, it } from 'vitest';

import { LADDER_ALLOWED_EVENT_PREFIXES, ladderSubscriptions } from './events';
import type { LadderService } from './service';

describe('granica anty-MLM: subskrypcje modułu ladder', () => {
  it('ladder konsumuje wyłącznie zdarzenia marketplace.* i community.*', () => {
    const subscriptions = ladderSubscriptions({} as LadderService);
    const types = Object.keys(subscriptions);
    expect(types.length).toBeGreaterThan(0);
    for (const type of types) {
      expect(
        LADDER_ALLOWED_EVENT_PREFIXES.some((prefix) => type.startsWith(prefix)),
        `Subskrypcja "${type}" łamie granicę anty-MLM (dozwolone: ${LADDER_ALLOWED_EVENT_PREFIXES.join(', ')})`,
      ).toBe(true);
    }
  });
});

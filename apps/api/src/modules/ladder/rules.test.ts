import { describe, expect, it } from 'vitest';

import { basePointsForRating, computeLevel, diminishingWeight, LEVELS } from './rules';

describe('reguły ruleset v1', () => {
  it('punkty bazowe zależą od oceny; słaba realizacja = 0', () => {
    expect(basePointsForRating(5)).toBe(100);
    expect(basePointsForRating(4)).toBe(80);
    expect(basePointsForRating(3)).toBe(40);
    expect(basePointsForRating(2)).toBe(0);
    expect(basePointsForRating(1)).toBe(0);
  });

  it('malejące zwroty: monotoniczne, z podłogą 0.1', () => {
    expect(diminishingWeight(0)).toBe(1);
    expect(diminishingWeight(1)).toBe(0.5);
    expect(diminishingWeight(2)).toBe(0.25);
    expect(diminishingWeight(10)).toBe(0.1);
    for (let n = 0; n < 12; n++) {
      expect(diminishingWeight(n + 1)).toBeLessThanOrEqual(diminishingWeight(n));
    }
  });

  it('computeLevel: progi łączne do L3', () => {
    expect(computeLevel(0, 0)).toBe(0);
    expect(computeLevel(100, 0)).toBe(1);
    expect(computeLevel(0, 300)).toBe(2);
    expect(computeLevel(400, 300)).toBe(3);
  });

  it('od L4 wymagany minimalny udział OBU ścieżek (równowaga z briefu)', () => {
    // 1500 pkt tylko z marketplace: L4 wymaga min. 20% * 1500 = 300 z każdej.
    expect(computeLevel(1500, 0)).toBe(3);
    expect(computeLevel(1200, 299)).toBe(3);
    expect(computeLevel(1200, 300)).toBe(4);
    // czysty transakcjonizm nie wchodzi na L5+ (i odwrotnie)
    expect(computeLevel(12000, 0)).toBe(3);
    expect(computeLevel(0, 12000)).toBe(3);
    expect(computeLevel(9600, 2400)).toBe(7);
  });

  it('poziomy rosną monotonicznie w progach', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]!.pointsRequired).toBeGreaterThan(LEVELS[i - 1]!.pointsRequired);
      expect(LEVELS[i]!.level).toBe(LEVELS[i - 1]!.level + 1);
    }
  });
});

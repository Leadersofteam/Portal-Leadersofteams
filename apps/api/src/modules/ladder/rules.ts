// Ruleset v1 Drabinki Lidera (ADR-004). Wersjonowany: każda zmiana reguł
// to nowa wersja + wpis w publicznym CHANGELOG zasad; reguły nie działają
// wstecz (rulesetVersion zapisany na każdym PointEvent).
// Wartości progów do kalibracji warsztatowej z właścicielem (ROADMAP).

export const RULESET_VERSION = 'v1';

// Okno karencji: punkty PENDING liczą się do awansu dopiero po dojrzeniu.
export const MATURATION_DAYS = 7;

// Publikacja symultaniczna ocen: po tym oknie publikujemy też jednostronne.
export const REVIEW_PUBLICATION_WINDOW_DAYS = 14;

// Malejące zwroty od tego samego kontrahenta liczone w oknie kroczącym.
export const COUNTERPARTY_WINDOW_DAYS = 365;

// Obniżona waga ocen od świeżych firm (próg dojrzałości konta, ADR-004).
export const NEW_COMPANY_AGE_DAYS = 14;
export const NEW_COMPANY_WEIGHT = 0.5;

// --- ścieżka community (Q&A/mentoring, brief 3.3) — ruleset v1 --------------
// Kalibracja zatwierdzona przez właściciela (kamień decyzyjny Sprintu 5).
// Wypełnienie już zaprojektowanych typów (ANSWER_ACCEPTED/ANSWER_UPVOTED_QUALIFIED)
// — NIE zmiana reguły, więc RULESET_VERSION pozostaje v1.
// Punkt odniesienia: ocena 5/5 za zlecenie = 100 pkt (marketplace).
export const ANSWER_ACCEPTED_POINTS = 50;
export const ANSWER_UPVOTED_POINTS = 10;
// Limit tygodniowy ścieżki community — realizuje „postęp tygodniowy" z briefu
// (rytm B2B, bez mechanik nieskończonego zaangażowania). Nadmiar = wpis 0 pkt
// z wyjaśnieniem w meta (transparentność, ADR-004).
export const COMMUNITY_WEEKLY_CAP = 300;
export const COMMUNITY_WINDOW_DAYS = 7;
// Kwalifikacja głosu (ADR-004: próg dojrzałości + własna aktywność) — chroni
// przed farmieniem upvote'ów świeżymi/pustymi kontami. Niekwalifikowany głos
// = 0 punktów (i żadnego wpisu w ledgerze).
export const VOTER_MIN_ACCOUNT_AGE_DAYS = 14;
export const VOTER_MIN_ACTIVITY = 1;

export interface LevelRule {
  level: number;
  name: string;
  pointsRequired: number;
  /** Od L4: minimalny udział KAŻDEJ ścieżki (marketplace i community) w progu. */
  minPathSharePct: number;
  unlocksAppAccess: boolean;
  unlocksTeamCreation: boolean;
}

export const LEVELS: LevelRule[] = [
  {
    level: 1,
    name: 'Adept',
    pointsRequired: 100,
    minPathSharePct: 0,
    unlocksAppAccess: false,
    unlocksTeamCreation: false,
  },
  {
    level: 2,
    name: 'Praktyk',
    pointsRequired: 300,
    minPathSharePct: 0,
    unlocksAppAccess: false,
    unlocksTeamCreation: false,
  },
  {
    level: 3,
    name: 'Specjalista',
    pointsRequired: 700,
    minPathSharePct: 0,
    unlocksAppAccess: false,
    unlocksTeamCreation: false,
  },
  {
    level: 4,
    name: 'Ekspert',
    pointsRequired: 1500,
    minPathSharePct: 20,
    unlocksAppAccess: false,
    unlocksTeamCreation: false,
  },
  {
    level: 5,
    name: 'Mentor',
    pointsRequired: 3000,
    minPathSharePct: 20,
    unlocksAppAccess: true,
    unlocksTeamCreation: false,
  },
  {
    level: 6,
    name: 'Autorytet',
    pointsRequired: 6000,
    minPathSharePct: 20,
    unlocksAppAccess: true,
    unlocksTeamCreation: false,
  },
  {
    level: 7,
    name: 'Architekt Zespołów',
    pointsRequired: 12000,
    minPathSharePct: 20,
    unlocksAppAccess: true,
    unlocksTeamCreation: true,
  },
];

// Punkty bazowe za ocenione zlecenie: ocena musi być dobra, żeby punktować.
// Słaba realizacja (≤2) daje 0 — wpis w ledgerze i tak powstaje (transparentność).
export function basePointsForRating(rating: number): number {
  switch (rating) {
    case 5:
      return 100;
    case 4:
      return 80;
    case 3:
      return 40;
    default:
      return 0;
  }
}

// Malejące zwroty: n = liczba WCZEŚNIEJSZYCH punktowanych zdarzeń od tego
// samego kontrahenta w oknie. Podbijanie poziomu jedną zaprzyjaźnioną firmą
// staje się wykładniczo nieopłacalne (ADR-004).
export function diminishingWeight(previousCount: number): number {
  return Math.max(0.1, Math.pow(0.5, previousCount));
}

// Ścieżki punktowania (brief 3.3: dwie równoważne ścieżki).
export type PointPath = 'marketplace' | 'community';

export function pathForType(type: string): PointPath {
  return type.startsWith('ORDER_') ? 'marketplace' : 'community';
}

// Poziom z projekcji: najwyższy poziom, którego próg łączny jest osiągnięty
// i (od L4) każda ścieżka wnosi min. minPathSharePct progu.
export function computeLevel(marketplacePoints: number, communityPoints: number): number {
  const total = marketplacePoints + communityPoints;
  let achieved = 0;
  for (const rule of LEVELS) {
    if (total < rule.pointsRequired) break;
    if (rule.minPathSharePct > 0) {
      const minPerPath = (rule.minPathSharePct / 100) * rule.pointsRequired;
      if (Math.min(marketplacePoints, communityPoints) < minPerPath) break;
    }
    achieved = rule.level;
  }
  return achieved;
}

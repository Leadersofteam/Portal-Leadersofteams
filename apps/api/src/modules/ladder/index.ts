// Publiczne API modułu ladder (granice modułów — ADR-002).
//
// Faza 0/1 (sprint 1–2): stub — każdy użytkownik ma poziom 0. Pełny moduł
// (append-only ledger PointEvent, projekcja LadderState, 7 poziomów,
// antyfraud — ADR-004) wchodzi w sprincie 2–3. Marketplace już teraz
// korzysta wyłącznie z tego API (bramka minLevel), więc podmiana stuba
// na realną projekcję nie dotknie żadnego innego modułu.

export interface LadderService {
  getLevel(userId: string): Promise<number>;
}

export function createLadderService(): LadderService {
  return {
    async getLevel(_userId: string): Promise<number> {
      return 0;
    },
  };
}

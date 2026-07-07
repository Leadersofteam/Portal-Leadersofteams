import type { Prisma } from '@prisma/client';

// Zapis zdarzenia domenowego w TEJ SAMEJ transakcji co zmiana stanu
// (wzorzec outbox — ADR-007). Publikacją zajmuje się dispatcher w worker.ts.
export function emitEvent(
  tx: Prisma.TransactionClient,
  type: string,
  payload: Prisma.InputJsonValue,
) {
  return tx.outboxEvent.create({ data: { type, payload } });
}

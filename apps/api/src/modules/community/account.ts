import type { PrismaClient } from '../../shared/db';
import type { AccountDataModule } from '../identity/index';

// Treści użytkownika w module community (Q&A) na potrzeby RODO (D6). Anonimizujemy
// autorskie treści (pytania, odpowiedzi); głosy nie są treścią PII.
export function createCommunityAccountData(prisma: PrismaClient): AccountDataModule {
  return {
    async anonymizeUserContent(userId) {
      await prisma.thread.updateMany({
        where: { authorUserId: userId },
        data: { title: '[usunięto]', body: '[treść usunięta]' },
      });
      await prisma.answer.updateMany({
        where: { authorUserId: userId },
        data: { body: '[treść usunięta]' },
      });
    },

    async exportUserData(userId) {
      const [threads, answers, votes] = await Promise.all([
        prisma.thread.findMany({ where: { authorUserId: userId } }),
        prisma.answer.findMany({ where: { authorUserId: userId } }),
        prisma.answerVote.findMany({ where: { userId } }),
      ]);
      return { threads, answers, answerVotes: votes };
    },
  };
}

import type { PrismaClient } from '../../shared/db';
import type { AccountDataModule } from '../identity/index';

// Treści użytkownika w module groups na potrzeby RODO (D6). Anonimizujemy
// autorskie treści (posty, komentarze); członkostwa/reakcje nie są treścią PII.
export function createGroupsAccountData(prisma: PrismaClient): AccountDataModule {
  return {
    async anonymizeUserContent(userId) {
      await prisma.post.updateMany({
        where: { authorUserId: userId },
        data: { title: '[usunięto]', body: '[treść usunięta]' },
      });
      await prisma.comment.updateMany({
        where: { authorUserId: userId },
        data: { body: '[treść usunięta]' },
      });
    },

    async exportUserData(userId) {
      const [memberships, posts, comments, reactions] = await Promise.all([
        prisma.groupMembership.findMany({ where: { userId } }),
        prisma.post.findMany({ where: { authorUserId: userId } }),
        prisma.comment.findMany({ where: { authorUserId: userId } }),
        prisma.reaction.findMany({ where: { userId } }),
      ]);
      return { groupMemberships: memberships, posts, comments, reactions };
    },
  };
}

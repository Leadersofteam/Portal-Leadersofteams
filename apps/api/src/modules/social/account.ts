import type { PrismaClient } from '../../shared/db';
import type { AccountDataModule } from '../identity/index';

// RODO (D6): relacje obserwowania i oś aktywności użytkownika.
export function createSocialAccountData(prisma: PrismaClient): AccountDataModule {
  return {
    async anonymizeUserContent(userId) {
      await prisma.follow.deleteMany({
        where: { OR: [{ followerId: userId }, { followedId: userId }] },
      });
      await prisma.activityItem.deleteMany({ where: { actorId: userId } });
      await prisma.user.updateMany({ where: { id: userId }, data: { handle: null } });
    },

    async exportUserData(userId) {
      const [following, followers, activity] = await Promise.all([
        prisma.follow.findMany({ where: { followerId: userId } }),
        prisma.follow.findMany({ where: { followedId: userId } }),
        prisma.activityItem.findMany({ where: { actorId: userId } }),
      ]);
      return { following, followers, activityItems: activity };
    },
  };
}

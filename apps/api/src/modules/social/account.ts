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
      // Wpisy i komentarze portalowe — soft delete z wyczyszczoną treścią,
      // spójnie z resztą RODO (wiersz zostaje, treść znika).
      await prisma.socialPost.updateMany({
        where: { authorUserId: userId, deletedAt: null },
        data: { deletedAt: new Date(), body: '' },
      });
      await prisma.socialComment.updateMany({
        where: { authorUserId: userId, deletedAt: null },
        data: { deletedAt: new Date(), body: '' },
      });
      await prisma.socialReaction.deleteMany({ where: { userId } });
      await prisma.user.updateMany({ where: { id: userId }, data: { handle: null } });
    },

    async exportUserData(userId) {
      const [following, followers, activity, posts, comments] = await Promise.all([
        prisma.follow.findMany({ where: { followerId: userId } }),
        prisma.follow.findMany({ where: { followedId: userId } }),
        prisma.activityItem.findMany({ where: { actorId: userId } }),
        prisma.socialPost.findMany({ where: { authorUserId: userId } }),
        prisma.socialComment.findMany({ where: { authorUserId: userId } }),
      ]);
      return {
        following,
        followers,
        activityItems: activity,
        socialPosts: posts,
        socialComments: comments,
      };
    },
  };
}

import type { PrismaClient } from '../../shared/db';
import type { AccountDataModule } from '../identity/index';

// Dane osobowe/treści użytkownika w module marketplace na potrzeby RODO (D6).
// Zlecenia (orders) to dane FIRMY (biznesowe), nie dane osobowe autora —
// zostają; anonimizujemy to, co osobiste: profil Lidera, portfolio, treść ofert
// i komentarze ocen. Każdy moduł czyści WYŁĄCZNIE własne tabele (ADR-002).
export function createMarketplaceAccountData(prisma: PrismaClient): AccountDataModule {
  return {
    async anonymizeUserContent(userId) {
      const profile = await prisma.leaderProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (profile) {
        await prisma.portfolioItem.deleteMany({ where: { leaderProfileId: profile.id } });
        await prisma.offer.updateMany({
          where: { leaderProfileId: profile.id },
          data: { message: '[treść usunięta]' },
        });
        await prisma.leaderProfile.update({
          where: { userId },
          data: { headline: 'Profil usunięty', bio: null, isVisible: false },
        });
      }
      await prisma.review.updateMany({ where: { authorUserId: userId }, data: { comment: null } });
    },

    async exportUserData(userId) {
      const leaderProfile = await prisma.leaderProfile.findUnique({
        where: { userId },
        include: { portfolioItems: true },
      });
      const offers = leaderProfile
        ? await prisma.offer.findMany({ where: { leaderProfileId: leaderProfile.id } })
        : [];
      const ordersCreated = await prisma.order.findMany({ where: { createdById: userId } });
      const reviewsAuthored = await prisma.review.findMany({ where: { authorUserId: userId } });
      return { leaderProfile, offers, ordersCreated, reviewsAuthored };
    },
  };
}

import type { PrismaClient } from '../../shared/db';
import type { AccountDataModule } from '../identity/index';

// RODO (D6): treści użytkownika w module listings. Usługi Lidera są kaskadowo
// zależne od LeaderProfile (Cascade przy anonimizacji profili robi marketplace),
// więc tu anonimizujemy tylko treści autorskie w zapytaniach.
export function createListingsAccountData(prisma: PrismaClient): AccountDataModule {
  return {
    async anonymizeUserContent(userId) {
      await prisma.inquiryMessage.updateMany({
        where: { authorId: userId },
        data: { body: '[treść usunięta]' },
      });
      // Usługi anonimizowanego Lidera znikają z katalogu.
      const profile = await prisma.leaderProfile.findUnique({ where: { userId } });
      if (profile) {
        await prisma.serviceListing.updateMany({
          where: { leaderProfileId: profile.id },
          data: { status: 'ARCHIVED' },
        });
      }
    },

    async exportUserData(userId) {
      const profile = await prisma.leaderProfile.findUnique({ where: { userId } });
      const [listings, inquiries, messages, favorites] = await Promise.all([
        profile
          ? prisma.serviceListing.findMany({ where: { leaderProfileId: profile.id } })
          : Promise.resolve([]),
        prisma.inquiry.findMany({ where: { createdById: userId } }),
        prisma.inquiryMessage.findMany({ where: { authorId: userId } }),
        prisma.listingFavorite.findMany({ where: { userId } }),
      ]);
      return { serviceListings: listings, inquiries, inquiryMessages: messages, listingFavorites: favorites };
    },
  };
}

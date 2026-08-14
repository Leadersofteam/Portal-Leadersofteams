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
      // Ulubione to prywatna półka jednej osoby — po usunięciu konta nie ma czego
      // zachowywać (dokładnie ten sam powód co przy zakładkach w module social).
      // Dołożone w S18 razem ze stroną `/panel/ulubione`: skoro użytkownik widzi
      // tę półkę i czyta w `/panel/konto`, że prywatne listy znikają, to muszą
      // znikać naprawdę.
      await prisma.listingFavorite.deleteMany({ where: { userId } });
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
      return {
        serviceListings: listings,
        inquiries,
        inquiryMessages: messages,
        listingFavorites: favorites,
      };
    },
  };
}

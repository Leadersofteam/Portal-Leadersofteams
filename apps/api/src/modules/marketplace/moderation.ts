import type { ModerationSubjectModule } from '../antifraud/index';
import { excerpt } from '../antifraud/index';
import type { PrismaClient } from '../../shared/db';
import type { IdentityService } from '../identity/index';

// Podgląd ZLECENIA dla moderatora (S12).
//
// ŚWIADOMIE BEZ `hide`. Zlecenie nie jest publiczną treścią do zdjęcia, tylko
// zapisem umowy między Firmą a Liderem: wiszą na nim oferty, cykl realizacji
// i przyszłe oceny. Ukrycie go zerwałoby pracę dwóm stronom, z których żadna
// nie jest przedmiotem zgłoszenia. Moderator dostaje podgląd i link, a decyzja
// (kontakt ze stroną, ewentualne cofnięcie punktów) zapada poza tym przyciskiem.
// Brak `hide` sprawia, że panel nie pokaże akcji, a API ją odrzuci.
export function createMarketplaceModerationSubject(
  prisma: PrismaClient,
  identity: Pick<IdentityService, 'getPublicUsers'>,
): ModerationSubjectModule {
  return {
    subjectType: 'ORDER',

    async loadMany(ids) {
      const orders = await prisma.order.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          createdById: true,
        },
      });
      const authors = await identity.getPublicUsers(orders.map((o) => o.createdById));
      return new Map(
        orders.map((order) => [
          order.id,
          {
            exists: true,
            hidden: false,
            title: `${order.title} (${order.status})`,
            excerpt: excerpt(order.description),
            authorUserId: order.createdById,
            authorDisplayName: authors.get(order.createdById)?.displayName ?? null,
          },
        ]),
      );
    },
  };
}

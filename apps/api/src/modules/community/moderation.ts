import type { ModerationSubjectModule } from '../antifraud/index';
import { excerpt } from '../antifraud/index';
import type { PrismaClient } from '../../shared/db';
import type { IdentityService } from '../identity/index';

// Podgląd i ukrycie WĄTKU Q&A dla moderatora (S12).
//
// Q&A jest jedną z dwóch PUNKTOWANYCH ścieżek awansu (ADR-004), więc to tutaj
// skoncentruje się nadużycie warte zgłoszenia — i dlatego ten typ dostał realną
// akcję, a nie sam podgląd. Ukrycie wątku odcina też akceptację odpowiedzi
// i głosowanie (patrz service.ts), czyli zatrzymuje naliczanie punktów.
export function createCommunityModerationSubject(
  prisma: PrismaClient,
  identity: Pick<IdentityService, 'getPublicUsers'>,
): ModerationSubjectModule {
  return {
    subjectType: 'THREAD',

    async loadMany(ids) {
      const threads = await prisma.thread.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          groupId: true,
          title: true,
          body: true,
          authorUserId: true,
          hiddenAt: true,
        },
      });
      const authors = await identity.getPublicUsers(threads.map((t) => t.authorUserId));
      return new Map(
        threads.map((thread) => [
          thread.id,
          {
            exists: true,
            hidden: thread.hiddenAt !== null,
            title: thread.title,
            excerpt: excerpt(thread.body),
            authorUserId: thread.authorUserId,
            authorDisplayName: authors.get(thread.authorUserId)?.displayName ?? null,
            context: { groupId: thread.groupId },
          },
        ]),
      );
    },

    async hide(id) {
      // Treść zostaje w bazie (odwracalne), znika z odczytów. Odpowiedzi
      // świadomie NIE są kasowane — punkty już przyznane za nie żyją
      // w append-only ledgerze i cofa je osobna decyzja (RELEASE/REJECT).
      await prisma.thread.updateMany({
        where: { id, hiddenAt: null },
        data: { hiddenAt: new Date() },
      });
    },
  };
}

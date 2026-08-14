import type { ModerationSubjectModule } from '../antifraud/index';
import { excerpt } from '../antifraud/index';
import type { PrismaClient } from '../../shared/db';
import type { IdentityService } from '../identity/index';
import { hideGroupPost } from './service';

// Podgląd i ukrycie POSTA W GRUPIE dla moderatora (S12).
export function createGroupsModerationSubject(
  prisma: PrismaClient,
  identity: Pick<IdentityService, 'getPublicUsers'>,
): ModerationSubjectModule {
  return {
    subjectType: 'POST',

    async loadMany(ids) {
      const posts = await prisma.post.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          groupId: true,
          title: true,
          body: true,
          authorUserId: true,
          deletedAt: true,
          moderationStatus: true,
        },
      });
      const authors = await identity.getPublicUsers(posts.map((p) => p.authorUserId));
      return new Map(
        posts.map((post) => [
          post.id,
          {
            exists: true,
            hidden: post.deletedAt !== null || post.moderationStatus === 'HIDDEN',
            title: post.title,
            excerpt: excerpt(post.body),
            authorUserId: post.authorUserId,
            authorDisplayName: authors.get(post.authorUserId)?.displayName ?? null,
            // Link do posta w grupie wymaga OBU id (/grupy/:g/post/:id) — bez
            // groupId front miałby id treści i nie miałby jak jej otworzyć.
            context: { groupId: post.groupId },
          },
        ]),
      );
    },

    // Ta sama implementacja co dla moderatora GRUPY (S17) — patrz `hideGroupPost`
    // w service.ts. Odczyty grup filtrują po VISIBLE od Sprintu 4, więc treść
    // znika z listy i ze strony posta bez żadnej dodatkowej zmiany.
    async hide(id) {
      await hideGroupPost(prisma, id);
    },
  };
}

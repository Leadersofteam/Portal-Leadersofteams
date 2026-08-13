import type { ModerationSubjectModule } from '../antifraud/index';
import { excerpt } from '../antifraud/index';
import type { PrismaClient } from '../../shared/db';
import type { IdentityService } from '../identity/index';
import { takeDownSocialPost } from './service';

// Podgląd i ukrycie WPISU PORTALOWEGO dla moderatora (S12).
// Moduł social czyta i modyfikuje wyłącznie własne tabele (ADR-002); autora
// pobiera przez publiczne API identity, a nie zapytaniem do `users`.
export function createSocialModerationSubject(
  prisma: PrismaClient,
  identity: Pick<IdentityService, 'getPublicUsers'>,
): ModerationSubjectModule {
  return {
    subjectType: 'SOCIAL_POST',

    async loadMany(ids) {
      const posts = await prisma.socialPost.findMany({
        where: { id: { in: ids } },
        select: { id: true, body: true, authorUserId: true, deletedAt: true },
      });
      const authors = await identity.getPublicUsers(posts.map((p) => p.authorUserId));
      return new Map(
        posts.map((post) => [
          post.id,
          {
            exists: true,
            hidden: post.deletedAt !== null,
            title: null,
            // Po ukryciu `body` jest puste — mówimy o tym wprost, zamiast
            // pokazywać moderatorowi pustą kartę i kazać zgadywać.
            excerpt: post.deletedAt ? '[treść zdjęta]' : excerpt(post.body),
            authorUserId: post.authorUserId,
            authorDisplayName: authors.get(post.authorUserId)?.displayName ?? null,
          },
        ]),
      );
    },

    async hide(id) {
      await takeDownSocialPost(prisma, id);
    },
  };
}

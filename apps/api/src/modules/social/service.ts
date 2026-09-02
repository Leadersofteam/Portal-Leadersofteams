import type {
  BookmarkSubjectType,
  CreateSocialCommentInput,
  CreateSocialPostInput,
  FeedScope,
  UpdateSocialPostInput,
} from '@lot/contracts';
import type { Prisma } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import { DomainError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { emitEvent } from '../../shared/outbox';
import { toBooleanQuery } from '../../shared/fulltext';
import { extractMentions } from '../../shared/mentions';
import { extractTopics } from '../../shared/topics';
import { enforceFreshAccountQuota, FRESH_ACCOUNT_LIMITS } from '../../shared/quota';
import type { Redis } from '../../shared/redis';
import type { IdentityService } from '../identity/index';
import type { LadderService } from '../ladder/index';

// Moduł social — „X-lite" w duchu ADR-010: obserwowanie + CHRONOLOGICZNY feed
// obserwowanych (kursor, „Wczytaj więcej"), publiczny profil @handle.
// Twarde granice: zero algorytmu, zero punktów (ladder nie zna zdarzeń social.*),
// zero DM (kontakt przez zapytania o usługi / wątki ofert).

export type ActivityType =
  | 'POST_PUBLISHED'
  | 'LISTING_PUBLISHED'
  | 'ANSWER_ACCEPTED'
  | 'LEVEL_ACHIEVED'
  | 'SOCIAL_POST_PUBLISHED';

export interface SocialDeps {
  prisma: PrismaClient;
  identity: Pick<
    IdentityService,
    | 'getPublicUsers'
    | 'ensureHandle'
    | 'getUserIdByHandle'
    | 'getUserIdsByHandles'
    | 'getUserCreatedAt'
  >;
  ladder: Pick<LadderService, 'getLevels'>;
  // Walidacja własności obrazów przy wpisie — ten sam wzorzec co w listings.
  // Opcjonalna, bo worker buduje ten sam serwis bez warstwy uploadów.
  files?: { assertOwned(fileId: string, ownerId: string, kind?: string): Promise<void> };
  redis?: Redis;
}

const FEED_LIMIT = 20;
const BOOKMARKS_LIMIT = 20;

/**
 * Pozycja na półce „Zapisane". Jeden kształt dla obu rodzajów treści: wpis
 * portalowy nie ma tytułu ani grupy, post w grupie ma jedno i drugie — front
 * ma odróżniać je po `subjectType`, a nie po tym, których pól brakuje.
 * ŚWIADOMIE bez jakiegokolwiek licznika (ADR-010).
 */
export interface BookmarkItem {
  subjectType: BookmarkSubjectType;
  subjectId: string;
  savedAt: Date;
  title: string | null;
  body: string;
  authorName: string;
  groupId: string | null;
  groupName: string | null;
  publishedAt: Date;
}

/**
 * Kursor listy zakładek: czas zapisania + identyfikator treści. Sam czas nie
 * wystarcza — dwie zakładki zapisane w tej samej milisekundzie (a to normalne
 * przy szybkim klikaniu) zjadłyby się nawzajem na granicy strony.
 */
function encodeBookmarkCursor(createdAt: Date, subjectId: string): string {
  return `${createdAt.toISOString()}|${subjectId}`;
}

function decodeBookmarkCursor(cursor: string): { createdAt: Date; subjectId: string } | null {
  const [iso, subjectId] = cursor.split('|');
  if (!iso || !subjectId) return null;
  const createdAt = new Date(iso);
  return Number.isNaN(createdAt.getTime()) ? null : { createdAt, subjectId };
}

/** Podgląd cytowanego wpisu w karcie. `available: false` = treść zniknęła. */
export type QuotedPost =
  | { id: string; available: false }
  | {
      id: string;
      available: true;
      body: string;
      createdAt: Date;
      author: {
        id: string;
        displayName: string;
        handle: string | null;
        avatarFileId: string | null;
      };
    };

/**
 * Zdjęcie wpisu portalowego z obiegu. Wspólne dla usunięcia przez autora
 * i dla ukrycia przez moderatora (S12) — celowo JEDNA implementacja, bo dwie
 * kopie tej operacji rozjechałyby się przy pierwszej zmianie i zostawiłyby
 * sierotę w feedzie w jednej ze ścieżek.
 *
 * Feed jest projekcją: bez skasowania `ActivityItem` po ukrytym wpisie zostaje
 * kafelek linkujący w 404.
 */
export async function takeDownSocialPost(prisma: PrismaClient, postId: string): Promise<void> {
  await prisma.socialPost.update({
    where: { id: postId },
    data: { deletedAt: new Date(), body: '' },
  });
  await prisma.activityItem.deleteMany({
    where: { type: 'SOCIAL_POST_PUBLISHED', subjectId: postId },
  });
}

export function createSocialService({ prisma, identity, ladder, files, redis }: SocialDeps) {
  // Wzmianki @handle w treści wpisu/komentarza → powiadomienie dla wymienionego.
  // Payload niesie socialPostId (a nie groupId), więc powiadomienie linkuje
  // do permalinku wpisu zamiast lądować w ogólnej liście.
  async function emitMentions(
    tx: Parameters<typeof emitEvent>[0],
    body: string,
    authorUserId: string,
    socialPostId: string,
  ) {
    const handles = extractMentions(body);
    if (handles.length === 0) return;
    const ids = await identity.getUserIdsByHandles(handles);
    for (const mentionedId of ids.values()) {
      if (mentionedId === authorUserId) continue;
      await emitEvent(tx, 'social.user_mentioned', {
        mentionedUserId: mentionedId,
        authorUserId,
        socialPostId,
      });
    }
  }

  /**
   * Obrazy i cytowane wpisy dla PARTII wpisów naraz. Feed renderuje do 20 pozycji,
   * więc pojedyncze zapytanie na wpis byłoby N+1 na najczęściej otwieranym widoku
   * w całym Portalu.
   *
   * Cytat renderujemy PŁASKO — cytowany wpis nie niesie swojego cytatu. Inaczej
   * łańcuch „cytat cytatu cytatu" rozjechałby kartę na 390 px, a przy okazji
   * dawałby nieograniczoną głębokość zapytań.
   */
  async function loadPostExtras(postIds: string[]) {
    if (postIds.length === 0) {
      return { imagesBy: new Map<string, string[]>(), quotedBy: new Map<string, QuotedPost>() };
    }
    const [images, roots] = await Promise.all([
      prisma.socialPostImage.findMany({
        where: { postId: { in: postIds } },
        orderBy: [{ position: 'asc' }],
        select: { postId: true, fileId: true },
      }),
      prisma.socialPost.findMany({
        where: { id: { in: postIds } },
        select: { id: true, quotedPostId: true },
      }),
    ]);

    const imagesBy = new Map<string, string[]>();
    for (const img of images) {
      imagesBy.set(img.postId, [...(imagesBy.get(img.postId) ?? []), img.fileId]);
    }

    const quotedIds = [
      ...new Set(roots.map((r) => r.quotedPostId).filter((id): id is string => Boolean(id))),
    ];
    const quotedBy = new Map<string, QuotedPost>();
    if (quotedIds.length > 0) {
      const quoted = await prisma.socialPost.findMany({
        where: { id: { in: quotedIds } },
        select: { id: true, body: true, authorUserId: true, deletedAt: true, createdAt: true },
      });
      const quotedAuthors = await identity.getPublicUsers(quoted.map((q) => q.authorUserId));
      const quotedById = new Map(quoted.map((q) => [q.id, q]));
      for (const root of roots) {
        if (!root.quotedPostId) continue;
        const q = quotedById.get(root.quotedPostId);
        // Cytowany wpis skasowany albo ukryty przez moderatora: zamiast znikać
        // po cichu (co zmieniłoby sens cudzej wypowiedzi), mówimy wprost.
        if (!q || q.deletedAt) {
          quotedBy.set(root.id, { id: root.quotedPostId, available: false });
          continue;
        }
        quotedBy.set(root.id, {
          id: q.id,
          available: true,
          body: q.body,
          createdAt: q.createdAt,
          author: {
            id: q.authorUserId,
            displayName: quotedAuthors.get(q.authorUserId)?.displayName ?? 'Użytkownik',
            handle: quotedAuthors.get(q.authorUserId)?.handle ?? null,
            avatarFileId: quotedAuthors.get(q.authorUserId)?.avatarFileId ?? null,
          },
        });
      }
    }
    return { imagesBy, quotedBy };
  }

  /**
   * Wydobywa #tematy z treści i podpina je do wpisu albo postu w grupie.
   *
   * DLACZEGO TUTAJ, w module `social`: tematy są PROJEKCJĄ treści, tak samo jak
   * oś aktywności. Powstają w tym samym konsumencie, który buduje feed, więc
   * jest jedno miejsce, w którym „opublikowana treść" zamienia się w to, co
   * widać w nawigacji. Gdyby każdy moduł zapisywał tematy u siebie, mielibyśmy
   * dwie implementacje parsera i dwa sposoby na ich rozjechanie.
   *
   * Idempotentne: przy ponownym przetworzeniu zdarzenia (retry joba) nic się
   * nie dubluje, bo powiązanie ma klucz złożony.
   */
  async function syncTopics(kind: 'social' | 'group', postId: string, body: string) {
    const topics = extractTopics(body);
    if (topics.length === 0) return;
    for (const topic of topics) {
      const row = await prisma.topic.upsert({
        where: { slug: topic.slug },
        update: {},
        create: { slug: topic.slug, name: topic.name },
      });
      if (kind === 'social') {
        await prisma.socialPostTopic.createMany({
          data: [{ postId, topicId: row.id }],
          skipDuplicates: true,
        });
      } else {
        await prisma.postTopic.createMany({
          data: [{ postId, topicId: row.id }],
          skipDuplicates: true,
        });
      }
    }
  }

  async function requireOwnPost(postId: string, userId: string) {
    const post = await prisma.socialPost.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorUserId: true },
    });
    if (!post) throw new NotFoundError('Wpis nie istnieje');
    if (post.authorUserId !== userId) {
      throw new ForbiddenError('NOT_OWNER', 'To nie jest Twój wpis');
    }
    return post;
  }

  return {
    async follow(userId: string, targetUserId: string) {
      if (userId === targetUserId) {
        throw new DomainError('SELF_FOLLOW', 'Nie można obserwować samego siebie', 400);
      }
      const target = await prisma.user.findFirst({
        where: { id: targetUserId, anonymizedAt: null },
        select: { id: true },
      });
      if (!target) throw new NotFoundError('Użytkownik nie istnieje');
      await prisma.follow.createMany({
        data: [{ followerId: userId, followedId: targetUserId }],
        skipDuplicates: true,
      });
      // Obserwowany dostaje uchwyt — jego profil staje się linkowalny w feedzie.
      await identity.ensureHandle(targetUserId);
      return { following: true };
    },

    async unfollow(userId: string, targetUserId: string) {
      await prisma.follow.deleteMany({
        where: { followerId: userId, followedId: targetUserId },
      });
      return { following: false };
    },

    async isFollowing(userId: string, targetUserId: string) {
      const row = await prisma.follow.findUnique({
        where: { followerId_followedId: { followerId: userId, followedId: targetUserId } },
      });
      return Boolean(row);
    },

    // --- wpisy portalowe (X-lite) --------------------------------------------

    async createPost(userId: string, input: CreateSocialPostInput) {
      await enforceFreshAccountQuota(
        redis,
        identity.getUserCreatedAt,
        userId,
        FRESH_ACCOUNT_LIMITS.social_post,
      );

      const imageFileIds = input.imageFileIds ?? [];
      // Własność pliku sprawdzamy PRZED transakcją: cudzy identyfikator pliku
      // ma odbić się od walidacji, a nie wylądować w bazie i wyciec w feedzie.
      if (imageFileIds.length > 0 && files) {
        for (const fileId of imageFileIds) await files.assertOwned(fileId, userId, 'SOCIAL');
      }

      // Wpis bez treści ma sens tylko wtedy, gdy niesie go obraz albo cytat.
      if (input.body.length === 0 && imageFileIds.length === 0 && !input.quotedPostId) {
        throw new DomainError('EMPTY_POST', 'Wpis nie może być pusty', 400);
      }

      let quotedPostId: string | null = null;
      if (input.quotedPostId) {
        if (input.quotedPostId === userId) {
          throw new DomainError('INVALID_QUOTE', 'Nieprawidłowy cytowany wpis', 400);
        }
        const quoted = await prisma.socialPost.findFirst({
          where: { id: input.quotedPostId, deletedAt: null },
          select: { id: true, authorUserId: true, quotedPostId: true },
        });
        if (!quoted) throw new NotFoundError('Cytowany wpis nie istnieje');
        // Cytowanie cytatu spłaszczamy do ORYGINAŁU. Inaczej po kilku podaniach
        // dalej karta byłaby matrioszką, a użytkownik i tak chce zobaczyć źródło.
        quotedPostId = quoted.quotedPostId ?? quoted.id;
      }

      const result = await prisma.$transaction(async (tx) => {
        const post = await tx.socialPost.create({
          data: { authorUserId: userId, body: input.body, quotedPostId },
        });
        if (imageFileIds.length > 0) {
          await tx.socialPostImage.createMany({
            data: imageFileIds.map((fileId, position) => ({ postId: post.id, fileId, position })),
          });
        }
        await emitEvent(tx, 'social.post_published', { postId: post.id, authorUserId: userId });
        if (quotedPostId) {
          const quotedAuthor = await tx.socialPost.findUnique({
            where: { id: quotedPostId },
            select: { authorUserId: true },
          });
          // Powiadomienie dla cytowanego — ZERO punktów (ADR-004). Zdarzenie
          // konsumuje wyłącznie `notifications`; ladder go nie subskrybuje
          // i pilnuje tego strukturalny test anty-MLM.
          if (quotedAuthor && quotedAuthor.authorUserId !== userId) {
            await emitEvent(tx, 'social.post_quoted', {
              postId: post.id,
              quotedPostId,
              quotedAuthorUserId: quotedAuthor.authorUserId,
              actorUserId: userId,
            });
          }
        }
        await emitMentions(tx, input.body, userId, post.id);
        return { id: post.id };
      });
      // Uchwyt musi istnieć, zanim wpis pojawi się w feedzie — inaczej autor
      // renderuje się bez linku do własnego profilu.
      await identity.ensureHandle(userId);
      return result;
    },

    async updatePost(userId: string, postId: string, input: UpdateSocialPostInput) {
      await requireOwnPost(postId, userId);
      await prisma.socialPost.update({
        where: { id: postId },
        data: { body: input.body, editedAt: new Date() },
      });
      return { id: postId };
    },

    async deletePost(userId: string, postId: string) {
      await requireOwnPost(postId, userId);
      await takeDownSocialPost(prisma, postId);
      return { id: postId };
    },

    async addComment(userId: string, postId: string, input: CreateSocialCommentInput) {
      const post = await prisma.socialPost.findFirst({
        where: { id: postId, deletedAt: null },
        select: { id: true, authorUserId: true },
      });
      if (!post) throw new NotFoundError('Wpis nie istnieje');

      if (input.parentId) {
        const parent = await prisma.socialComment.findUnique({
          where: { id: input.parentId },
          select: { postId: true, parentId: true },
        });
        if (!parent || parent.postId !== postId) {
          throw new DomainError(
            'INVALID_PARENT',
            'Komentarz nadrzędny nie należy do tego wpisu',
            400,
          );
        }
        if (parent.parentId) {
          throw new DomainError(
            'MAX_DEPTH',
            'Komentarze mają maksymalnie jeden poziom zagłębienia',
            400,
          );
        }
      }

      return prisma.$transaction(async (tx) => {
        const comment = await tx.socialComment.create({
          data: {
            postId,
            authorUserId: userId,
            parentId: input.parentId ?? null,
            body: input.body,
          },
        });
        await emitEvent(tx, 'social.comment_added', {
          commentId: comment.id,
          socialPostId: postId,
          postAuthorUserId: post.authorUserId,
          actorUserId: userId,
        });
        await emitMentions(tx, input.body, userId, postId);
        return { id: comment.id };
      });
    },

    async deleteComment(userId: string, commentId: string) {
      const comment = await prisma.socialComment.findUnique({
        where: { id: commentId },
        select: { id: true, authorUserId: true },
      });
      if (!comment) throw new NotFoundError('Komentarz nie istnieje');
      if (comment.authorUserId !== userId) {
        throw new ForbiddenError('NOT_OWNER', 'To nie jest Twój komentarz');
      }
      await prisma.socialComment.update({
        where: { id: commentId },
        data: { deletedAt: new Date(), body: '' },
      });
      return { id: commentId };
    },

    // „Doceniam" — jeden typ reakcji, zero punktów (ADR-004). Idempotentne
    // dzięki kluczowi złożonemu: ponowne kliknięcie nie mnoży wierszy.
    async appreciate(userId: string, postId: string) {
      const post = await prisma.socialPost.findFirst({
        where: { id: postId, deletedAt: null },
        select: { id: true },
      });
      if (!post) throw new NotFoundError('Wpis nie istnieje');
      try {
        await prisma.socialReaction.create({ data: { postId, userId } });
      } catch (err: unknown) {
        if (!(typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002')) {
          throw err;
        }
      }
      return { appreciated: true, count: await prisma.socialReaction.count({ where: { postId } }) };
    },

    async unappreciate(userId: string, postId: string) {
      await prisma.socialReaction.deleteMany({ where: { postId, userId } });
      return {
        appreciated: false,
        count: await prisma.socialReaction.count({ where: { postId } }),
      };
    },

    // --- Zakładki (S17) -------------------------------------------------------
    //
    // ADR-010: ŻADNA z tych metod nie zwraca liczby zapisań i nigdy nie będzie.
    // To nie przeoczenie — publiczny licznik zamieniłby prywatną półkę „na
    // później" w drugą walutę popularności obok „doceniam". Zakładka ma służyć
    // jednej osobie: tej, która ją założyła.
    //
    // ANTY-MLM: zero zdarzeń outboxa. Tak samo jak `identity.updateOnboarding` —
    // brak zdarzenia to brak drogi do laddera, czyli zabezpieczenie wynikające
    // z architektury, a nie z regulaminu.

    /** Stan zakładek widza dla PARTII treści — feed woła to raz na stronę, nie raz na kartę. */
    async getViewerBookmarks(
      userId: string,
      subjectType: BookmarkSubjectType,
      subjectIds: string[],
    ): Promise<Set<string>> {
      if (subjectIds.length === 0) return new Set();
      const rows = await prisma.bookmark.findMany({
        where: { userId, subjectType, subjectId: { in: subjectIds } },
        select: { subjectId: true },
      });
      return new Set(rows.map((r) => r.subjectId));
    },

    async bookmark(userId: string, subjectType: BookmarkSubjectType, subjectId: string) {
      // Istnienie i widoczność treści sprawdzamy PRZED zapisem — inaczej na
      // półce lądowałby identyfikator prowadzący w 404, a przy okazji dałoby
      // się sondować bazę: „zapisało się" byłoby odpowiedzią „ten wpis istnieje".
      const exists =
        subjectType === 'SOCIAL_POST'
          ? await prisma.socialPost.findFirst({
              where: { id: subjectId, deletedAt: null },
              select: { id: true },
            })
          : await prisma.post.findFirst({
              where: { id: subjectId, deletedAt: null, moderationStatus: 'VISIBLE' },
              select: { id: true },
            });
      if (!exists) throw new NotFoundError('Treść nie istnieje');
      try {
        await prisma.bookmark.create({ data: { userId, subjectType, subjectId } });
      } catch (err: unknown) {
        // Klucz złożony (userId, subjectType, subjectId) → powtórne zapisanie
        // jest no-opem, nie błędem (idempotencja jak przy „doceniam").
        if (!(typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002')) {
          throw err;
        }
      }
      return { bookmarked: true };
    },

    async unbookmark(userId: string, subjectType: BookmarkSubjectType, subjectId: string) {
      await prisma.bookmark.deleteMany({ where: { userId, subjectType, subjectId } });
      return { bookmarked: false };
    },

    /**
     * Prywatna lista „Zapisane" — chronologicznie po czasie ZAPISANIA, nie
     * publikacji: człowiek wraca do tego, co odłożył ostatnio.
     *
     * Treść usunięta albo ukryta przez moderatora znika z listy, choć wiersz
     * zakładki zostaje (polimorf bez klucza obcego — patrz komentarz w schemacie).
     * Skutek uboczny: strona bywa krótsza niż `limit`. Świadomie wolimy to od
     * kafelka „treść niedostępna", którego nie da się kliknąć ani usunąć.
     */
    async listBookmarks(
      userId: string,
      { cursor, limit = BOOKMARKS_LIMIT }: { cursor?: string; limit?: number } = {},
    ) {
      const decoded = cursor ? decodeBookmarkCursor(cursor) : null;
      const rows = await prisma.bookmark.findMany({
        where: {
          userId,
          ...(decoded
            ? {
                OR: [
                  { createdAt: { lt: decoded.createdAt } },
                  { createdAt: decoded.createdAt, subjectId: { lt: decoded.subjectId } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { subjectId: 'desc' }],
        take: limit + 1,
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];

      const socialIds = page.filter((r) => r.subjectType === 'SOCIAL_POST').map((r) => r.subjectId);
      const groupIds = page.filter((r) => r.subjectType === 'POST').map((r) => r.subjectId);

      const [socialPosts, groupPosts] = await Promise.all([
        socialIds.length
          ? prisma.socialPost.findMany({
              where: { id: { in: socialIds }, deletedAt: null },
              select: { id: true, body: true, authorUserId: true, createdAt: true },
            })
          : Promise.resolve([]),
        groupIds.length
          ? prisma.post.findMany({
              where: { id: { in: groupIds }, deletedAt: null, moderationStatus: 'VISIBLE' },
              select: {
                id: true,
                title: true,
                body: true,
                authorUserId: true,
                createdAt: true,
                groupId: true,
                group: { select: { name: true } },
              },
            })
          : Promise.resolve([]),
      ]);

      const authors = await identity.getPublicUsers([
        ...socialPosts.map((p) => p.authorUserId),
        ...groupPosts.map((p) => p.authorUserId),
      ]);
      const authorName = (id: string) => authors.get(id)?.displayName ?? 'Użytkownik';
      const socialById = new Map(socialPosts.map((p) => [p.id, p]));
      const groupById = new Map(groupPosts.map((p) => [p.id, p]));

      const items = page.flatMap<BookmarkItem>((row) => {
        if (row.subjectType === 'SOCIAL_POST') {
          const post = socialById.get(row.subjectId);
          if (!post) return [];
          return [
            {
              subjectType: 'SOCIAL_POST' as const,
              subjectId: post.id,
              savedAt: row.createdAt,
              title: null,
              body: post.body,
              authorName: authorName(post.authorUserId),
              groupId: null,
              groupName: null,
              publishedAt: post.createdAt,
            },
          ];
        }
        const post = groupById.get(row.subjectId);
        if (!post) return [];
        return [
          {
            subjectType: 'POST' as const,
            subjectId: post.id,
            savedAt: row.createdAt,
            title: post.title,
            body: post.body,
            authorName: authorName(post.authorUserId),
            groupId: post.groupId,
            groupName: post.group.name,
            publishedAt: post.createdAt,
          },
        ];
      });

      return {
        items,
        nextCursor: hasMore && last ? encodeBookmarkCursor(last.createdAt, last.subjectId) : null,
      };
    },

    // Permalink wpisu — czytelny także dla gościa (treść jest publiczna).
    async getPost(postId: string, viewerId?: string) {
      const post = await prisma.socialPost.findFirst({
        where: { id: postId, deletedAt: null },
      });
      if (!post) throw new NotFoundError('Wpis nie istnieje');

      const comments = await prisma.socialComment.findMany({
        where: { postId },
        orderBy: [{ createdAt: 'asc' }],
        take: 200,
      });

      const userIds = [...new Set([post.authorUserId, ...comments.map((c) => c.authorUserId)])];
      const [users, levels, appreciations, mine, extras, bookmarked] = await Promise.all([
        identity.getPublicUsers(userIds),
        ladder.getLevels(userIds),
        prisma.socialReaction.count({ where: { postId } }),
        viewerId
          ? prisma.socialReaction.findUnique({
              where: { postId_userId: { postId, userId: viewerId } },
            })
          : Promise.resolve(null),
        loadPostExtras([postId]),
        viewerId
          ? prisma.bookmark.findUnique({
              where: {
                userId_subjectType_subjectId: {
                  userId: viewerId,
                  subjectType: 'SOCIAL_POST',
                  subjectId: postId,
                },
              },
            })
          : Promise.resolve(null),
      ]);

      const person = (id: string) => ({
        id,
        displayName: users.get(id)?.displayName ?? 'Użytkownik',
        handle: users.get(id)?.handle ?? null,
        avatarFileId: users.get(id)?.avatarFileId ?? null,
        level: levels.get(id) ?? 0,
      });

      return {
        post: {
          id: post.id,
          body: post.body,
          createdAt: post.createdAt,
          editedAt: post.editedAt,
          author: person(post.authorUserId),
          isOwn: viewerId === post.authorUserId,
          appreciations,
          viewerAppreciated: Boolean(mine),
          // ADR-010: stan zakładki widza, NIGDY liczba zapisań.
          viewerBookmarked: Boolean(bookmarked),
          imageFileIds: extras.imagesBy.get(postId) ?? [],
          quoted: extras.quotedBy.get(postId) ?? null,
        },
        comments: comments.map((c) => ({
          id: c.id,
          parentId: c.parentId,
          body: c.deletedAt ? '[treść usunięta]' : c.body,
          deleted: Boolean(c.deletedAt),
          createdAt: c.createdAt,
          author: person(c.authorUserId),
          isOwn: viewerId === c.authorUserId,
        })),
      };
    },

    // Chronologiczny feed (ADR-010: bez rankingu, bez infinite scroll — web
    // renderuje przycisk „Wczytaj więcej"). Dwa zakresy:
    //   following — oś obserwowanych (wymaga sesji),
    //   all       — cała społeczność, także dla gościa. ActivityItem niesie
    //               wyłącznie dane i tak publiczne, więc to nie jest nowy wyciek,
    //               a pusty rynek nie wybacza ekranu logowania na wejściu.
    async getFeed(
      userId: string | null,
      { scope = 'following' as FeedScope, cursor, limit = FEED_LIMIT } = {} as {
        scope?: FeedScope;
        cursor?: string;
        limit?: number;
      },
    ) {
      let followedIds: string[] = [];
      if (userId) {
        const following = await prisma.follow.findMany({
          where: { followerId: userId },
          select: { followedId: true },
        });
        followedIds = following.map((f) => f.followedId);
      }

      // Własna aktywność należy do osi „Obserwowani" (W-04): bez tego autor
      // tuż po publikacji widział pusty stan „Nie obserwujesz jeszcze nikogo"
      // i wpis wyglądał na zgubiony. followingCount celowo NIE liczy autora —
      // pusty stan z zachętą do obserwowania ma dalej działać u konta bez treści.
      const visibleIds = userId ? [...followedIds, userId] : followedIds;

      const empty = {
        items: [] as never[],
        nextCursor: null,
        followingCount: followedIds.length,
        scope,
      };
      if (scope === 'following' && visibleIds.length === 0) return empty;

      const rows = await prisma.activityItem.findMany({
        where: scope === 'following' ? { actorId: { in: visibleIds } } : {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      // Wpisy portalowe renderujemy z AKTUALNEJ treści, nie z meta zamrożonej
      // w chwili publikacji — inaczej edycja i usunięcie nie byłyby widoczne.
      const postIds = page
        .filter((r) => r.type === 'SOCIAL_POST_PUBLISHED')
        .map((r) => r.subjectId);
      const actorIds = [...new Set(page.map((r) => r.actorId))];
      const [users, levels, posts, reactionCounts, commentCounts] = await Promise.all([
        identity.getPublicUsers(actorIds),
        ladder.getLevels(actorIds),
        postIds.length
          ? prisma.socialPost.findMany({
              where: { id: { in: postIds }, deletedAt: null },
              select: { id: true, body: true, editedAt: true },
            })
          : Promise.resolve([]),
        postIds.length
          ? prisma.socialReaction.groupBy({
              by: ['postId'],
              where: { postId: { in: postIds } },
              _count: { postId: true },
            })
          : Promise.resolve([]),
        postIds.length
          ? prisma.socialComment.groupBy({
              by: ['postId'],
              where: { postId: { in: postIds }, deletedAt: null },
              _count: { postId: true },
            })
          : Promise.resolve([]),
      ]);

      const extras = await loadPostExtras(postIds);
      const postById = new Map(posts.map((p) => [p.id, p]));
      const reactionsBy = new Map(reactionCounts.map((r) => [r.postId, r._count.postId]));
      const commentsBy = new Map(commentCounts.map((c) => [c.postId, c._count.postId]));

      // Stan WIDZA dla całej strony dwoma zapytaniami.
      // ZASTANE: do S17 feed w ogóle nie wiedział, co widz już docenił — front
      // miał na sztywno `initialActive={false}`, więc docenione wpisy wyglądały
      // na niedocenione, a ponowne kliknięcie kasowało własne docenienie.
      const [viewerReacted, viewerBookmarked] = await Promise.all([
        userId && postIds.length
          ? prisma.socialReaction
              .findMany({
                where: { userId, postId: { in: postIds } },
                select: { postId: true },
              })
              .then((rows) => new Set(rows.map((r) => r.postId)))
          : Promise.resolve(new Set<string>()),
        userId && postIds.length
          ? prisma.bookmark
              .findMany({
                where: { userId, subjectType: 'SOCIAL_POST', subjectId: { in: postIds } },
                select: { subjectId: true },
              })
              .then((rows) => new Set(rows.map((r) => r.subjectId)))
          : Promise.resolve(new Set<string>()),
      ]);

      return {
        items: page
          // Wpis usunięty tuż po pobraniu strony — nie pokazujemy pustego kafelka.
          .filter((r) => r.type !== 'SOCIAL_POST_PUBLISHED' || postById.has(r.subjectId))
          .map((r) => {
            const post = postById.get(r.subjectId);
            return {
              id: r.id,
              type: r.type,
              subjectId: r.subjectId,
              meta: (r.meta ?? {}) as Record<string, unknown>,
              createdAt: r.createdAt,
              ...(post
                ? {
                    post: {
                      body: post.body,
                      editedAt: post.editedAt,
                      imageFileIds: extras.imagesBy.get(post.id) ?? [],
                      quoted: extras.quotedBy.get(post.id) ?? null,
                      appreciations: reactionsBy.get(post.id) ?? 0,
                      comments: commentsBy.get(post.id) ?? 0,
                      viewerAppreciated: viewerReacted.has(post.id),
                      // ADR-010: stan zakładki widza, NIGDY liczba zapisań.
                      viewerBookmarked: viewerBookmarked.has(post.id),
                    },
                  }
                : {}),
              actor: {
                id: r.actorId,
                displayName: users.get(r.actorId)?.displayName ?? 'Użytkownik',
                handle: users.get(r.actorId)?.handle ?? null,
                avatarFileId: users.get(r.actorId)?.avatarFileId ?? null,
                level: levels.get(r.actorId) ?? 0,
              },
            };
          }),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
        followingCount: followedIds.length,
        scope,
      };
    },

    // Wyszukiwanie wpisów portalowych (dla modułu search) — korzysta z indeksu
    // FULLTEXT social_posts(body) dodanego razem z encją.
    async searchPosts(q: string, limit = 10) {
      const expr = toBooleanQuery(q);
      const ids = expr
        ? (
            await prisma.$queryRaw<Array<{ id: string }>>`
              SELECT id FROM social_posts
              WHERE MATCH(body) AGAINST(${expr} IN BOOLEAN MODE)
                AND deletedAt IS NULL
              LIMIT 50`
          ).map((r) => r.id)
        : null;

      const rows = await prisma.socialPost.findMany({
        where: ids
          ? { id: { in: ids }, deletedAt: null }
          : { body: { contains: q }, deletedAt: null },
        select: { id: true, body: true, authorUserId: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
      });
      return rows.map((r) => ({
        id: r.id,
        excerpt: r.body.slice(0, 160),
        authorUserId: r.authorUserId,
        createdAt: r.createdAt,
      }));
    },

    // Publiczny profil społecznościowy: oś aktywności + liczniki obserwujących.
    async getPublicProfile(handle: string) {
      const userId = await identity.getUserIdByHandle(handle);
      if (!userId) throw new NotFoundError('Profil nie istnieje');
      const [users, levels, followers, following, activity, leaderProfile] = await Promise.all([
        identity.getPublicUsers([userId]),
        ladder.getLevels([userId]),
        prisma.follow.count({ where: { followedId: userId } }),
        prisma.follow.count({ where: { followerId: userId } }),
        prisma.activityItem.findMany({
          where: { actorId: userId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 30,
        }),
        prisma.leaderProfile.findFirst({
          where: { userId, isVisible: true },
          select: { id: true, headline: true },
        }),
      ]);
      const user = users.get(userId);
      if (!user) throw new NotFoundError('Profil nie istnieje');
      return {
        user: {
          id: userId,
          displayName: user.displayName,
          handle: user.handle,
          avatarFileId: user.avatarFileId,
          level: levels.get(userId) ?? 0,
        },
        leaderProfile,
        followers,
        following,
        activity: activity.map((a) => ({
          id: a.id,
          type: a.type,
          subjectId: a.subjectId,
          meta: (a.meta ?? {}) as Record<string, unknown>,
          createdAt: a.createdAt,
        })),
      };
    },

    async getMySocial(userId: string) {
      const handle = await identity.ensureHandle(userId);
      const [followers, following] = await Promise.all([
        prisma.follow.count({ where: { followedId: userId } }),
        prisma.follow.count({ where: { followerId: userId } }),
      ]);
      return { handle, followers, following };
    },

    // --- konsumenci zdarzeń (worker) — materializacja feedu -------------------

    async recordActivity(input: {
      actorId: string;
      type: ActivityType;
      subjectId: string;
      meta?: Record<string, unknown>;
    }) {
      await prisma.activityItem.createMany({
        data: [
          {
            actorId: input.actorId,
            type: input.type,
            subjectId: input.subjectId,
            meta: (input.meta ?? {}) as Prisma.InputJsonValue,
          },
        ],
        skipDuplicates: true, // unikat [type, subjectId] — konsument idempotentny
      });
    },

    async onPostPublished(p: { postId: string; groupId: string; authorUserId: string }) {
      const post = await prisma.post.findUnique({
        where: { id: p.postId },
        select: { title: true, body: true, deletedAt: true, group: { select: { name: true } } },
      });
      if (!post || post.deletedAt) return;
      // Tematy szukamy też w tytule — w poście grupowym to często tam trafia
      // słowo kluczowe całej dyskusji.
      await syncTopics('group', p.postId, `${post.title} ${post.body}`);
      await this.recordActivity({
        actorId: p.authorUserId,
        type: 'POST_PUBLISHED',
        subjectId: p.postId,
        meta: { title: post.title, groupId: p.groupId, groupName: post.group.name },
      });
    },

    async onListingPublished(p: { listingId: string; leaderUserId: string; title: string }) {
      const listing = await prisma.serviceListing.findUnique({
        where: { id: p.listingId },
        select: { slug: true, title: true },
      });
      await this.recordActivity({
        actorId: p.leaderUserId,
        type: 'LISTING_PUBLISHED',
        subjectId: p.listingId,
        meta: { title: listing?.title ?? p.title, slug: listing?.slug ?? null },
      });
    },

    async onAnswerAccepted(p: { answerId: string; threadId: string; answerAuthorUserId: string }) {
      const thread = await prisma.thread.findUnique({
        where: { id: p.threadId },
        select: { title: true },
      });
      await this.recordActivity({
        actorId: p.answerAuthorUserId,
        type: 'ANSWER_ACCEPTED',
        subjectId: p.answerId,
        meta: { threadId: p.threadId, threadTitle: thread?.title ?? null },
      });
    },

    async onSocialPostPublished(p: { postId: string; authorUserId: string }) {
      const post = await prisma.socialPost.findUnique({
        where: { id: p.postId },
        select: { body: true, deletedAt: true },
      });
      if (!post || post.deletedAt) return;
      await syncTopics('social', p.postId, post.body);
      await this.recordActivity({
        actorId: p.authorUserId,
        type: 'SOCIAL_POST_PUBLISHED',
        subjectId: p.postId,
        // Skrót tylko na potrzeby kart OG i powiadomień — feed czyta treść na żywo.
        meta: { excerpt: post.body.slice(0, 160) },
      });
    },

    // Post grupowy usunięty przez autora → sprzątamy jego ślad w feedzie.
    // Robi to social, nie groups: tabela activity_items należy do tego modułu
    // (ADR-002 — moduł czyści wyłącznie własne tabele).
    async onGroupPostDeleted(p: { postId: string }) {
      await prisma.activityItem.deleteMany({
        where: { type: 'POST_PUBLISHED', subjectId: p.postId },
      });
    },

    async onLevelAchieved(p: { userId: string; level: number; achievementId: string }) {
      await this.recordActivity({
        actorId: p.userId,
        type: 'LEVEL_ACHIEVED',
        subjectId: p.achievementId,
        meta: { level: p.level },
      });
    },

    /**
     * Strona tematu — CHRONOLOGICZNIE (ADR-010: bez rankingu treści).
     * Łączy wpisy portalowe i posty w grupach, bo dla czytelnika „#HR" to jedna
     * rozmowa, niezależnie od tego, w której części Portalu się toczy.
     */
    async getTopic(slug: string, limit = 30) {
      const topic = await prisma.topic.findUnique({ where: { slug } });
      if (!topic) return null;

      const [socialLinks, groupLinks] = await Promise.all([
        prisma.socialPostTopic.findMany({
          where: { topicId: topic.id },
          select: { postId: true },
          take: 200,
        }),
        prisma.postTopic.findMany({
          where: { topicId: topic.id },
          select: { postId: true },
          take: 200,
        }),
      ]);

      const [socialPosts, groupPosts] = await Promise.all([
        socialLinks.length
          ? prisma.socialPost.findMany({
              where: { id: { in: socialLinks.map((l) => l.postId) }, deletedAt: null },
              orderBy: [{ createdAt: 'desc' }],
              take: limit,
            })
          : Promise.resolve([]),
        groupLinks.length
          ? prisma.post.findMany({
              where: {
                id: { in: groupLinks.map((l) => l.postId) },
                deletedAt: null,
                moderationStatus: 'VISIBLE',
              },
              orderBy: [{ createdAt: 'desc' }],
              take: limit,
              select: {
                id: true,
                title: true,
                body: true,
                createdAt: true,
                authorUserId: true,
                groupId: true,
                group: { select: { name: true } },
              },
            })
          : Promise.resolve([]),
      ]);

      const authorIds = [
        ...new Set([
          ...socialPosts.map((p) => p.authorUserId),
          ...groupPosts.map((p) => p.authorUserId),
        ]),
      ];
      const [users, levels] = await Promise.all([
        identity.getPublicUsers(authorIds),
        ladder.getLevels(authorIds),
      ]);
      const person = (id: string) => ({
        id,
        displayName: users.get(id)?.displayName ?? 'Użytkownik',
        handle: users.get(id)?.handle ?? null,
        avatarFileId: users.get(id)?.avatarFileId ?? null,
        level: levels.get(id) ?? 0,
      });

      // Scalamy i sortujemy po czasie — jedna oś, nie dwie listy obok siebie.
      const items = [
        ...socialPosts.map((p) => ({
          kind: 'social' as const,
          id: p.id,
          title: null as string | null,
          body: p.body,
          createdAt: p.createdAt,
          groupId: null as string | null,
          groupName: null as string | null,
          author: person(p.authorUserId),
        })),
        ...groupPosts.map((p) => ({
          kind: 'group' as const,
          id: p.id,
          title: p.title,
          body: p.body,
          createdAt: p.createdAt,
          groupId: p.groupId,
          groupName: p.group.name,
          author: person(p.authorUserId),
        })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

      return { topic: { name: topic.name, slug: topic.slug }, items };
    },

    /**
     * Najczęściej używane tematy — WYŁĄCZNIE jako podpowiedź nawigacyjna.
     * ADR-010 zabrania rankingu TREŚCI; to jest ranking etykiet, tak samo jak
     * chipy popularnych tagów w katalogu usług.
     */
    async getPopularTopics(limit = 12) {
      const [socialCounts, groupCounts] = await Promise.all([
        prisma.socialPostTopic.groupBy({ by: ['topicId'], _count: { topicId: true } }),
        prisma.postTopic.groupBy({ by: ['topicId'], _count: { topicId: true } }),
      ]);
      const totals = new Map<string, number>();
      for (const row of [...socialCounts, ...groupCounts]) {
        totals.set(row.topicId, (totals.get(row.topicId) ?? 0) + row._count.topicId);
      }
      if (totals.size === 0) return [];
      const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      const topics = await prisma.topic.findMany({
        where: { id: { in: top.map(([id]) => id) } },
        select: { id: true, name: true, slug: true },
      });
      const byId = new Map(topics.map((t) => [t.id, t]));
      return top
        .map(([id, count]) => {
          const t = byId.get(id);
          return t ? { name: t.name, slug: t.slug, count } : null;
        })
        .filter((t): t is { name: string; slug: string; count: number } => t !== null);
    },

    // Analityka (S12): moduł liczy WŁASNĄ tabelę i oddaje samą liczbę (ADR-002).
    // Liczymy z bazy, a nie z licznika w Redisie — dane już tu są, więc licznik
    // byłby drugim, gorszym źródłem prawdy (ginie przy flushu, nie liczy wstecz).
    async countPostsBetween(from: Date, to: Date): Promise<number> {
      return prisma.socialPost.count({
        where: { createdAt: { gte: from, lt: to }, deletedAt: null },
      });
    },
  };
}

export type SocialService = ReturnType<typeof createSocialService>;

import type {
  CreateCommentInput,
  CreateGroupInput,
  CreatePostInput,
  GroupMemberRole,
} from '@lot/contracts';
import type { Prisma } from '@prisma/client';

import type { Cache } from '../../shared/cache';
import type { PrismaClient } from '../../shared/db';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { extractMentions } from '../../shared/mentions';
import { emitEvent } from '../../shared/outbox';
import { enforceFreshAccountQuota, FRESH_ACCOUNT_LIMITS } from '../../shared/quota';
import type { Redis } from '../../shared/redis';
import type { IdentityService } from '../identity/index';
import type { LadderService } from '../ladder/index';

// Próg poziomu do zakładania grup (ADR-010: parametr konfiguracyjny, start lvl 2)
// — bariera anty-spam przy otwartej rejestracji (R-13). NIE jest to punktacja.
export const GROUP_CREATION_MIN_LEVEL = 2;

// Cache publicznego listingu grup (D3).
const GROUPS_CACHE_NS = 'groups';
const GROUPS_CACHE_TTL = 300;

export interface GroupsServiceDeps {
  prisma: PrismaClient;
  // Walidacja własności obrazów przy poście (S17) — ten sam wzorzec co listings
  // i social. Opcjonalna: worker buduje ten serwis bez warstwy uploadów.
  files?: { assertOwned(fileId: string, ownerId: string, kind?: string): Promise<void> };
  // Stan zakładek widza (S17). Właścicielem zakładek jest moduł `social` — trzyma
  // je nad OBIEMA tabelami treści, tak samo jak tematy. Wstrzykujemy wąski
  // odczyt zamiast sięgać do jego tabeli (ADR-002); opcjonalny, jak `files`.
  bookmarks?: {
    getViewerBookmarks(userId: string, type: 'POST', ids: string[]): Promise<Set<string>>;
  };
  identity: Pick<IdentityService, 'getPublicUsers' | 'getUserCreatedAt' | 'getUserIdsByHandles'>;
  // ladder tylko do ODCZYTU poziomu (bramka) — żadnej krawędzi zdarzeń do ladder
  // (anty-MLM, ADR-010 dec. 4). Aktywność w groups nie generuje punktów.
  ladder: Pick<LadderService, 'getLevel'>;
  cache?: Cache;
  redis?: Redis;
}

const FEED_PAGE_DEFAULT = 20;

/**
 * Ukrycie posta w grupie. JEDNA implementacja dla dwóch ścieżek: moderatora
 * platformy (`/panel/moderacja`, modules/groups/moderation.ts) i moderatora
 * grupy (S17). To ten sam wzorzec co `takeDownSocialPost` w module social —
 * dwie kopie tej operacji rozjechałyby się przy pierwszej zmianie i jedna
 * ze ścieżek zostawiłaby sierotę na osi aktywności.
 *
 * `moderationStatus` zamiast `deletedAt`: ukrycie przez moderatora jest czymś
 * innym niż usunięcie przez autora i ma zostać odróżnialne w bazie (m.in. po
 * to, żeby dało się je kiedyś cofnąć).
 *
 * Przypięcie zdejmujemy razem z treścią — przypięty, ukryty post zostawiałby
 * w grupie pustą ramkę „Przypięte" bez zawartości.
 */
export async function hideGroupPost(prisma: PrismaClient, postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { groupId: true } });
  if (!post) return;
  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: { moderationStatus: 'HIDDEN', pinnedAt: null },
    });
    // Świadomie REUŻYWAMY istniejącego zdarzenia zamiast dokładać nowe:
    // `social` już je konsumuje i zdejmuje kafelek z osi aktywności.
    await emitEvent(tx, 'groups.post_deleted', { postId, groupId: post.groupId });
  });
}

export function createGroupsService({
  prisma,
  identity,
  ladder,
  cache,
  files,
  bookmarks,
  redis,
}: GroupsServiceDeps) {
  async function requireGroup(groupId: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundError('Grupa nie istnieje');
    return group;
  }

  async function membership(userId: string, groupId: string) {
    return prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  async function requireActiveMembership(userId: string, groupId: string) {
    const m = await membership(userId, groupId);
    if (!m || m.status !== 'ACTIVE') {
      throw new ForbiddenError('NOT_GROUP_MEMBER', 'Musisz być członkiem grupy');
    }
    return m;
  }

  /**
   * Pierwsza linia moderacji (S17). Do tej pory ta sama trójwarunkowa kontrola
   * stała skopiowana w dwóch miejscach; przy pięciu nowych operacjach kopie
   * rozjechałyby się na pewno — i to akurat w kodzie kontroli dostępu.
   *
   * Rola jest czytana Z BAZY przy każdym żądaniu, a nie z migawki sesji: rola
   * platformowa (`user.role`) jest zamrożona w sesji Redis i awans wymaga
   * przelogowania. Awans na moderatora grupy ma działać od razu.
   */
  async function requireGroupModerator(userId: string, groupId: string) {
    const m = await membership(userId, groupId);
    if (!m || m.role !== 'MODERATOR' || m.status !== 'ACTIVE') {
      throw new ForbiddenError('NOT_GROUP_MODERATOR', 'Wymagane uprawnienia moderatora grupy');
    }
    return m;
  }

  /** Liczba aktywnych moderatorów — bramka „grupa nie może zostać bez opieki". */
  async function activeModeratorCount(groupId: string): Promise<number> {
    return prisma.groupMembership.count({
      where: { groupId, role: 'MODERATOR', status: 'ACTIVE' },
    });
  }

  async function moderatorUserIds(groupId: string): Promise<string[]> {
    const mods = await prisma.groupMembership.findMany({
      where: { groupId, role: 'MODERATOR', status: 'ACTIVE' },
      select: { userId: true },
    });
    return mods.map((m) => m.userId);
  }

  // Właściwy odczyt listingu grup (owinięty cache-aside w listGroups).
  async function loadGroups(filters: {
    industryId?: string;
    q?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = filters.limit ?? FEED_PAGE_DEFAULT;
    const where: Prisma.GroupWhereInput = {
      ...(filters.industryId ? { industryId: filters.industryId } : {}),
      ...(filters.q ? { name: { contains: filters.q } } : {}),
    };
    const rows = await prisma.group.findMany({
      where,
      include: { industry: true, _count: { select: { memberships: true, posts: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      groups: page.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        isSystem: g.isSystem,
        industry: g.industry ? { id: g.industry.id, name: g.industry.name } : null,
        membersCount: g._count.memberships,
        postsCount: g._count.posts,
      })),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  // Wzmianki @handle → zdarzenie dla notifications (zero punktów — ladder
  // nie subskrybuje groups.*).
  async function emitMentions(
    tx: Parameters<typeof emitEvent>[0],
    body: string,
    authorUserId: string,
    context: { groupId: string; postId: string },
  ) {
    const handles = extractMentions(body);
    if (handles.length === 0) return;
    const ids = await identity.getUserIdsByHandles(handles);
    for (const mentionedId of ids.values()) {
      if (mentionedId === authorUserId) continue;
      await emitEvent(tx, 'groups.user_mentioned', {
        mentionedUserId: mentionedId,
        authorUserId,
        ...context,
      });
    }
  }

  return {
    // Publiczne API dla modułu community (granice — ADR-002): community
    // bramkuje wątki/odpowiedzi członkostwem w grupie, nie sięgając do tabel
    // groups. Odczyt statusu członkostwa — bez żadnej logiki punktowej.
    async isActiveMember(userId: string, groupId: string): Promise<boolean> {
      const m = await membership(userId, groupId);
      return m?.status === 'ACTIVE';
    },

    async createGroup(userId: string, input: CreateGroupInput) {
      // Bramka poziomu (jak marketplace.submitOffer) — odczyt z projekcji ladder.
      const level = await ladder.getLevel(userId);
      if (level < GROUP_CREATION_MIN_LEVEL) {
        throw new ForbiddenError(
          'LEVEL_TOO_LOW',
          `Zakładanie grup wymaga poziomu ${GROUP_CREATION_MIN_LEVEL} w Drabince Lidera (Twój poziom: ${level})`,
        );
      }
      if (input.industryId) {
        const industry = await prisma.industry.findUnique({ where: { id: input.industryId } });
        if (!industry) throw new DomainError('UNKNOWN_INDUSTRY', 'Nieznana branża', 400);
      }
      const result = await prisma.$transaction(async (tx) => {
        const group = await tx.group.create({
          data: {
            name: input.name,
            description: input.description ?? null,
            industryId: input.industryId ?? null,
            type: input.type,
            createdById: userId,
            memberships: { create: { userId, role: 'MODERATOR', status: 'ACTIVE' } },
          },
        });
        await emitEvent(tx, 'groups.group_created', { groupId: group.id, createdById: userId });
        return { id: group.id, type: group.type };
      });
      await cache?.bump(GROUPS_CACHE_NS); // listing grup nieaktualny
      return result;
    },

    async join(userId: string, groupId: string) {
      const group = await requireGroup(groupId);
      // Wyproszony wraca na odbicie od BANNED, a nie na „Jesteś już członkiem"
      // z kolizji unikatu (P2002 niżej) — komunikat, który by tu skłamał.
      const existing = await membership(userId, groupId);
      if (existing?.status === 'BANNED') {
        throw new ForbiddenError(
          'BANNED_FROM_GROUP',
          'Moderator tej grupy zakończył Twoje członkostwo',
        );
      }
      // MODERATED → PENDING (akceptacja moderatora); OPEN → od razu ACTIVE.
      const status = group.type === 'MODERATED' ? 'PENDING' : 'ACTIVE';
      try {
        await prisma.groupMembership.create({
          data: { groupId, userId, role: 'MEMBER', status },
        });
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          throw new ConflictError(
            'ALREADY_MEMBER',
            'Jesteś już członkiem lub czekasz na akceptację',
          );
        }
        throw err;
      }
      if (status === 'PENDING') {
        // Powiadomienie do moderatorów o prośbie o dołączenie (payload z odbiorcami,
        // żeby notifications nie sięgał do tabel groups — granice ADR-002).
        await prisma.outboxEvent.create({
          data: {
            type: 'groups.membership_requested',
            payload: {
              groupId,
              requesterUserId: userId,
              moderatorUserIds: await moderatorUserIds(groupId),
            },
          },
        });
      }
      await cache?.bump(GROUPS_CACHE_NS); // liczba członków w listingu zmieniona
      return { status };
    },

    async approveMembership(moderatorUserId: string, membershipId: string) {
      const m = await prisma.groupMembership.findUnique({ where: { id: membershipId } });
      if (!m) throw new NotFoundError('Wniosek o członkostwo nie istnieje');
      await requireGroupModerator(moderatorUserId, m.groupId);
      const result = await prisma.groupMembership.updateMany({
        where: { id: membershipId, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });
      if (result.count === 0) throw new ConflictError('NOT_PENDING', 'Wniosek nie jest oczekujący');
      await prisma.outboxEvent.create({
        data: {
          type: 'groups.membership_accepted',
          payload: { groupId: m.groupId, requesterUserId: m.userId },
        },
      });
      return { groupId: m.groupId, userId: m.userId };
    },

    async listPendingMemberships(moderatorUserId: string, groupId: string) {
      await requireGroupModerator(moderatorUserId, groupId);
      const pending = await prisma.groupMembership.findMany({
        where: { groupId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      const users = await identity.getPublicUsers(pending.map((m) => m.userId));
      return pending.map((m) => ({
        membershipId: m.id,
        userId: m.userId,
        displayName: users.get(m.userId)?.displayName ?? 'Użytkownik',
        createdAt: m.createdAt,
      }));
    },

    // --- pierwsza linia moderacji: skład grupy (S17) --------------------------

    async listMembers(moderatorUserId: string, groupId: string) {
      await requireGroupModerator(moderatorUserId, groupId);
      // Świadomie widok WYŁĄCZNIE dla moderatora: publiczna lista członków
      // grupy to dane o ludziach, a nie treść — Portal pokazuje na zewnątrz
      // liczbę członków, nie ich nazwiska.
      const members = await prisma.groupMembership.findMany({
        where: { groupId, status: { in: ['ACTIVE', 'BANNED'] } },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        take: 500,
      });
      const users = await identity.getPublicUsers(members.map((m) => m.userId));
      return members.map((m) => ({
        membershipId: m.id,
        userId: m.userId,
        displayName: users.get(m.userId)?.displayName ?? 'Użytkownik',
        handle: users.get(m.userId)?.handle ?? null,
        role: m.role,
        status: m.status,
        isSelf: m.userId === moderatorUserId,
        createdAt: m.createdAt,
      }));
    },

    /**
     * Awans na moderatora grupy i degradacja. Zero punktów Drabinki — rola
     * w grupie to obowiązek, nie status (ADR-004: status daje wyłącznie drugi
     * człowiek za realną pracę).
     */
    async setMemberRole(moderatorUserId: string, membershipId: string, role: GroupMemberRole) {
      const target = await prisma.groupMembership.findUnique({ where: { id: membershipId } });
      if (!target) throw new NotFoundError('Członkostwo nie istnieje');
      await requireGroupModerator(moderatorUserId, target.groupId);
      if (target.status !== 'ACTIVE') {
        throw new ConflictError('MEMBER_NOT_ACTIVE', 'To członkostwo nie jest aktywne');
      }
      if (target.role === role) return { membershipId, role };
      // Degradacja ostatniego moderatora zostawiłaby grupę bez opieki — czyli
      // dokładnie tę ślepą moderację, którą S12 zamykało na poziomie platformy.
      if (role === 'MEMBER' && (await activeModeratorCount(target.groupId)) <= 1) {
        throw new ConflictError(
          'LAST_MODERATOR',
          'To jedyny moderator grupy — najpierw wyznacz następcę',
        );
      }
      await prisma.$transaction(async (tx) => {
        await tx.groupMembership.update({ where: { id: membershipId }, data: { role } });
        // Bez powiadomienia człowiek zostaje moderatorem i nie ma jak się o tym
        // dowiedzieć — rola bez wiedzy o roli jest martwa.
        await emitEvent(tx, 'groups.membership_role_changed', {
          groupId: target.groupId,
          userId: target.userId,
          role,
          actorUserId: moderatorUserId,
        });
      });
      return { membershipId, role };
    },

    /**
     * Wyproszenie z grupy. `BANNED` istniał w schemacie od Sprintu 4 i nigdy
     * nie był używany — moderator grupy nie miał ŻADNEJ sankcji poza prośbą.
     * Zostaje jako status, a nie skasowanie wiersza: bez śladu wyproszona osoba
     * dołączyłaby ponownie jednym kliknięciem.
     */
    async banMember(moderatorUserId: string, membershipId: string) {
      const target = await prisma.groupMembership.findUnique({ where: { id: membershipId } });
      if (!target) throw new NotFoundError('Członkostwo nie istnieje');
      await requireGroupModerator(moderatorUserId, target.groupId);
      if (target.userId === moderatorUserId) {
        throw new ConflictError('SELF_BAN', 'Nie możesz wyprosić samego siebie');
      }
      // Moderatora najpierw się degraduje. Inaczej dwoje moderatorów mogłoby
      // się nawzajem wyrzucić, a kto pierwszy kliknie, ten ma grupę.
      if (target.role === 'MODERATOR') {
        throw new ConflictError(
          'TARGET_IS_MODERATOR',
          'Najpierw odbierz tej osobie rolę moderatora',
        );
      }
      await prisma.groupMembership.update({
        where: { id: membershipId },
        data: { status: 'BANNED' },
      });
      await cache?.bump(GROUPS_CACHE_NS); // liczba członków w listingu zmieniona
      return { membershipId, status: 'BANNED' as const };
    },

    // --- pierwsza linia moderacji: treść (S17) --------------------------------

    /** Ukrycie posta przez moderatora TEJ grupy — ta sama ścieżka co w panelu platformy. */
    async hidePost(moderatorUserId: string, postId: string) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, groupId: true, deletedAt: true },
      });
      if (!post || post.deletedAt) throw new NotFoundError('Post nie istnieje');
      await requireGroupModerator(moderatorUserId, post.groupId);
      await hideGroupPost(prisma, postId);
      await cache?.bump(GROUPS_CACHE_NS);
      return { id: postId, hidden: true };
    },

    /**
     * Przypięcie postu na górze grupy. NAJWYŻEJ JEDEN na grupę: przypięcie
     * nowego odpina poprzedni w tej samej transakcji. Dwa przypięcia to drugi
     * feed, a ADR-010 zabrania rankingu treści — jeden pin jest nawigacją
     * („zasady grupy", „zacznij tutaj"), nie kolejnością.
     */
    async pinPost(moderatorUserId: string, postId: string) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, groupId: true, deletedAt: true, moderationStatus: true },
      });
      if (!post || post.deletedAt || post.moderationStatus !== 'VISIBLE') {
        throw new NotFoundError('Post nie istnieje');
      }
      await requireGroupModerator(moderatorUserId, post.groupId);
      await prisma.$transaction(async (tx) => {
        await tx.post.updateMany({
          where: { groupId: post.groupId, pinnedAt: { not: null } },
          data: { pinnedAt: null },
        });
        await tx.post.update({ where: { id: postId }, data: { pinnedAt: new Date() } });
      });
      return { id: postId, pinned: true };
    },

    async unpinPost(moderatorUserId: string, postId: string) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, groupId: true },
      });
      if (!post) throw new NotFoundError('Post nie istnieje');
      await requireGroupModerator(moderatorUserId, post.groupId);
      await prisma.post.update({ where: { id: postId }, data: { pinnedAt: null } });
      return { id: postId, pinned: false };
    },

    async leave(userId: string, groupId: string) {
      const result = await prisma.groupMembership.deleteMany({ where: { groupId, userId } });
      if (result.count === 0) throw new NotFoundError('Nie jesteś członkiem tej grupy');
      await cache?.bump(GROUPS_CACHE_NS);
    },

    async createPost(userId: string, groupId: string, input: CreatePostInput) {
      await requireGroup(groupId);
      await requireActiveMembership(userId, groupId);
      // Limit publikacji dla świeżych kont (D7).
      await enforceFreshAccountQuota(
        redis,
        identity.getUserCreatedAt,
        userId,
        FRESH_ACCOUNT_LIMITS.group_post,
      );
      // Własność plików sprawdzamy PRZED transakcją — cudzy identyfikator ma
      // odbić się od walidacji, a nie wylądować w bazie i wyświetlić czyjeś
      // zdjęcie pod naszym nazwiskiem (ta sama bariera co przy wpisach).
      const imageFileIds = input.imageFileIds ?? [];
      if (imageFileIds.length > 0 && files) {
        for (const fileId of imageFileIds) await files.assertOwned(fileId, userId, 'SOCIAL');
      }

      const result = await prisma.$transaction(async (tx) => {
        const post = await tx.post.create({
          data: {
            groupId,
            authorUserId: userId,
            type: input.type,
            title: input.title,
            body: input.body,
          },
        });
        if (imageFileIds.length > 0) {
          await tx.postImage.createMany({
            data: imageFileIds.map((fileId, position) => ({ postId: post.id, fileId, position })),
          });
        }
        await emitEvent(tx, 'groups.post_published', {
          postId: post.id,
          groupId,
          authorUserId: userId,
        });
        await emitMentions(tx, `${input.title}\n${input.body}`, userId, {
          groupId,
          postId: post.id,
        });
        return { id: post.id };
      });
      await cache?.bump(GROUPS_CACHE_NS); // liczba postów w listingu zmieniona
      return result;
    },

    async addComment(userId: string, postId: string, input: CreateCommentInput) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, groupId: true, authorUserId: true },
      });
      if (!post) throw new NotFoundError('Post nie istnieje');
      await requireActiveMembership(userId, post.groupId);

      if (input.parentId) {
        const parent = await prisma.comment.findUnique({
          where: { id: input.parentId },
          select: { postId: true, parentId: true },
        });
        if (!parent || parent.postId !== postId) {
          throw new DomainError(
            'INVALID_PARENT',
            'Komentarz nadrzędny nie należy do tego posta',
            400,
          );
        }
        // Wątkowanie 1 poziom (ADR-010): nie można odpowiadać na odpowiedź.
        if (parent.parentId) {
          throw new DomainError(
            'MAX_DEPTH',
            'Komentarze mają maksymalnie jeden poziom zagłębienia',
            400,
          );
        }
      }

      return prisma.$transaction(async (tx) => {
        const comment = await tx.comment.create({
          data: {
            postId,
            authorUserId: userId,
            parentId: input.parentId ?? null,
            body: input.body,
          },
        });
        await emitEvent(tx, 'groups.comment_added', {
          commentId: comment.id,
          postId,
          groupId: post.groupId,
          postAuthorUserId: post.authorUserId,
          actorUserId: userId,
        });
        await emitMentions(tx, input.body, userId, { groupId: post.groupId, postId });
        return { id: comment.id };
      });
    },

    async react(userId: string, postId: string) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { groupId: true },
      });
      if (!post) throw new NotFoundError('Post nie istnieje');
      await requireActiveMembership(userId, post.groupId);
      try {
        await prisma.reaction.create({ data: { postId, userId } });
      } catch (err: unknown) {
        // Unikat (postId, userId) → ponowna reakcja jest no-opem (idempotencja).
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          return { reacted: true };
        }
        throw err;
      }
      return { reacted: true };
    },

    async unreact(userId: string, postId: string) {
      await prisma.reaction.deleteMany({ where: { postId, userId } });
      return { reacted: false };
    },

    // --- odczyty --------------------------------------------------------------

    async listGroups(filters: {
      industryId?: string;
      q?: string;
      cursor?: string;
      limit?: number;
    }) {
      // Cache-aside (D3): listing publiczny, niezależny od widza. Bez cache
      // (część testów) → odczyt bezpośredni.
      if (!cache) return loadGroups(filters);
      return cache.getOrSet(GROUPS_CACHE_NS, filters, GROUPS_CACHE_TTL, () => loadGroups(filters));
    },

    async getGroup(groupId: string, viewerId: string | null) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { industry: true, _count: { select: { memberships: true, posts: true } } },
      });
      if (!group) throw new NotFoundError('Grupa nie istnieje');
      const viewerMembership = viewerId ? await membership(viewerId, groupId) : null;
      return {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          type: group.type,
          isSystem: group.isSystem,
          industry: group.industry ? { id: group.industry.id, name: group.industry.name } : null,
          membersCount: group._count.memberships,
          postsCount: group._count.posts,
        },
        viewer: {
          membershipStatus: viewerMembership?.status ?? null,
          role: viewerMembership?.role ?? null,
        },
      };
    },

    async getGroupFeed(
      groupId: string,
      viewerId: string | null,
      filters: { cursor?: string; limit?: number },
    ) {
      await requireGroup(groupId);
      const limit = filters.limit ?? FEED_PAGE_DEFAULT;
      const postShape = {
        include: { _count: { select: { comments: true, reactions: true } } },
      } as const;

      const [rows, pinnedRow] = await Promise.all([
        // Feed chronologiczny (ADR-010): bez rankingu, paginacja kursorem.
        // Przypięty post jest WYKLUCZONY z tej listy na WSZYSTKICH stronach,
        // nie tylko pierwszej — inaczej wypłynąłby ponownie przy kursorze
        // i ta sama treść stałaby w grupie dwa razy.
        prisma.post.findMany({
          where: { groupId, moderationStatus: 'VISIBLE', deletedAt: null, pinnedAt: null },
          ...postShape,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
        }),
        // Przypięte pokazujemy tylko na pierwszej stronie — na kolejnych byłoby
        // powtórzeniem nagłówka, przez który czytelnik właśnie przewinął.
        filters.cursor
          ? Promise.resolve(null)
          : prisma.post.findFirst({
              where: {
                groupId,
                moderationStatus: 'VISIBLE',
                deletedAt: null,
                pinnedAt: { not: null },
              },
              ...postShape,
              orderBy: { pinnedAt: 'desc' },
            }),
      ]);
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      // Przypięty post jedzie przez te same zapytania wsadowe co reszta strony —
      // osobna ścieżka oznaczałaby drugą kopię hydratacji do rozjechania.
      const all = pinnedRow ? [pinnedRow, ...page] : page;
      const ids = all.map((p) => p.id);

      const [authors, reacted, images, bookmarked] = await Promise.all([
        identity.getPublicUsers(all.map((p) => p.authorUserId)),
        viewerId
          ? prisma.reaction.findMany({
              where: { userId: viewerId, postId: { in: ids } },
              select: { postId: true },
            })
          : Promise.resolve([]),
        // Obrazy dla CAŁEJ strony jednym zapytaniem — lista postów w grupie to
        // widok otwierany często, a N+1 tutaj nie widać w testach, tylko na prodzie.
        prisma.postImage.findMany({
          where: { postId: { in: ids } },
          orderBy: [{ position: 'asc' }],
          select: { postId: true, fileId: true },
        }),
        viewerId && bookmarks
          ? bookmarks.getViewerBookmarks(viewerId, 'POST', ids)
          : Promise.resolve(new Set<string>()),
      ]);

      const reactedSet = new Set(reacted.map((r) => r.postId));
      const imagesByPost = new Map<string, string[]>();
      for (const img of images) {
        imagesByPost.set(img.postId, [...(imagesByPost.get(img.postId) ?? []), img.fileId]);
      }

      const toDto = (p: (typeof all)[number]) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        body: p.body,
        authorName: authors.get(p.authorUserId)?.displayName ?? 'Użytkownik',
        imageFileIds: imagesByPost.get(p.id) ?? [],
        commentsCount: p._count.comments,
        reactionsCount: p._count.reactions,
        viewerReacted: reactedSet.has(p.id),
        // ADR-010: stan zakładki widza, NIGDY liczba zapisań.
        viewerBookmarked: bookmarked.has(p.id),
        pinned: p.pinnedAt !== null,
        createdAt: p.createdAt,
      });

      return {
        pinned: pinnedRow ? toDto(pinnedRow) : null,
        posts: page.map(toDto),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      };
    },

    async getPost(postId: string, viewerId: string | null) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          _count: { select: { reactions: true } },
          comments: { orderBy: { createdAt: 'asc' }, take: 500 },
          images: { orderBy: { position: 'asc' }, select: { fileId: true } },
        },
      });
      if (!post || post.moderationStatus !== 'VISIBLE' || post.deletedAt)
        throw new NotFoundError('Post nie istnieje');
      const userIds = [post.authorUserId, ...post.comments.map((c) => c.authorUserId)];
      const [users, viewerReaction, viewerBookmarks, viewerMembership] = await Promise.all([
        identity.getPublicUsers(userIds),
        viewerId
          ? prisma.reaction.findUnique({ where: { postId_userId: { postId, userId: viewerId } } })
          : Promise.resolve(null),
        viewerId && bookmarks
          ? bookmarks.getViewerBookmarks(viewerId, 'POST', [postId])
          : Promise.resolve(new Set<string>()),
        viewerId ? membership(viewerId, post.groupId) : Promise.resolve(null),
      ]);
      return {
        post: {
          id: post.id,
          groupId: post.groupId,
          type: post.type,
          title: post.title,
          body: post.body,
          imageFileIds: post.images.map((i) => i.fileId),
          authorName: users.get(post.authorUserId)?.displayName ?? 'Użytkownik',
          reactionsCount: post._count.reactions,
          viewerReacted: viewerReaction !== null,
          // ADR-010: stan zakładki widza, NIGDY liczba zapisań.
          viewerBookmarked: viewerBookmarks.has(postId),
          pinned: post.pinnedAt !== null,
          // Front musi wiedzieć, czy pokazać akcje moderatora TEJ grupy —
          // rola platformowa (`user.role`) to co innego niż rola w grupie.
          viewerIsGroupModerator:
            viewerMembership?.role === 'MODERATOR' && viewerMembership.status === 'ACTIVE',
          isOwn: post.authorUserId === viewerId,
          editedAt: post.editedAt,
          createdAt: post.createdAt,
        },
        comments: post.comments.map((c) => ({
          id: c.id,
          parentId: c.parentId,
          body: c.deletedAt ? '[treść usunięta]' : c.body,
          authorName: users.get(c.authorUserId)?.displayName ?? 'Użytkownik',
          isOwn: c.authorUserId === viewerId,
          editedAt: c.editedAt,
          deletedAt: c.deletedAt,
          createdAt: c.createdAt,
        })),
      };
    },

    // --- Edycja/usuwanie WŁASNYCH treści (S4, soft delete) -------------------

    async updatePost(userId: string, postId: string, input: { title?: string; body?: string }) {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post || post.deletedAt) throw new NotFoundError('Post nie istnieje');
      if (post.authorUserId !== userId) throw new ForbiddenError();
      await prisma.post.update({
        where: { id: postId },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.body ? { body: input.body } : {}),
          editedAt: new Date(),
        },
      });
      return { id: postId };
    },

    async deletePost(userId: string, postId: string) {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post || post.deletedAt) throw new NotFoundError('Post nie istnieje');
      if (post.authorUserId !== userId) throw new ForbiddenError();
      await prisma.$transaction(async (tx) => {
        await tx.post.update({
          where: { id: postId },
          data: { deletedAt: new Date(), title: '[usunięto]', body: '[treść usunięta]' },
        });
        // Feed jest projekcją w module social — bez tego zdarzenia usunięty post
        // zostawał na osi aktywności z dawnym tytułem i linkiem prowadzącym w 404.
        await emitEvent(tx, 'groups.post_deleted', { postId, groupId: post.groupId });
      });
      await cache?.bump(GROUPS_CACHE_NS);
      return { id: postId };
    },

    async deleteComment(userId: string, commentId: string) {
      const comment = await prisma.comment.findUnique({ where: { id: commentId } });
      if (!comment || comment.deletedAt) throw new NotFoundError('Komentarz nie istnieje');
      if (comment.authorUserId !== userId) throw new ForbiddenError();
      await prisma.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date(), body: '[treść usunięta]' },
      });
      return { id: commentId };
    },
  };
}

export type GroupsService = ReturnType<typeof createGroupsService>;

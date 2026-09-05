import type {
  CreateLeaderProfileInput,
  LeaderFilters,
  PortfolioItemInput,
  UpdateLeaderProfileInput,
} from '@lot/contracts';
import type { Prisma } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import { ConflictError, DomainError, NotFoundError } from '../../shared/errors';
import type { IdentityService } from '../identity/index';

const MAX_PORTFOLIO_ITEMS = 20;

export interface PublicLeaderCard {
  id: string;
  userId: string;
  displayName: string;
  avatarFileId: string | null;
  headline: string;
  industry: { name: string; slug: string };
}

export interface ProfilesService {
  listIndustries(): Promise<Array<{ id: string; name: string; slug: string }>>;
  listPublicLeaders(
    filters: LeaderFilters,
  ): Promise<{ leaders: PublicLeaderCard[]; nextCursor: string | null }>;
  createProfile(userId: string, input: CreateLeaderProfileInput): Promise<{ id: string }>;
  updateProfile(userId: string, input: UpdateLeaderProfileInput): Promise<{ id: string }>;
  getMyProfile(userId: string): Promise<unknown | null>;
  getPublicProfile(profileId: string): Promise<unknown>;
  addPortfolioItem(userId: string, input: PortfolioItemInput): Promise<{ id: string }>;
  removePortfolioItem(userId: string, itemId: string): Promise<void>;
  // Lejek (PL0): liczba profili Liderów założonych w oknie — sama liczba.
  countProfilesCreatedBetween(from: Date, to: Date): Promise<number>;
}

export function createProfilesService(
  prisma: PrismaClient,
  identity: Pick<IdentityService, 'getPublicUsers'>,
  // Walidacja własności obrazów portfolio (moduł files); opcjonalna w testach.
  files?: { assertOwned(fileId: string, ownerId: string, kind?: string): Promise<void> },
): ProfilesService {
  async function requireIndustry(industryId: string) {
    const industry = await prisma.industry.findUnique({ where: { id: industryId } });
    if (!industry) throw new DomainError('UNKNOWN_INDUSTRY', 'Nieznana branża', 400);
  }

  async function requireOwnProfile(userId: string) {
    const profile = await prisma.leaderProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new DomainError(
        'PROFILE_REQUIRED',
        'Najpierw utwórz profil Lidera (wybierz branżę i przedstaw się)',
        400,
      );
    }
    return profile;
  }

  return {
    async listIndustries() {
      return prisma.industry.findMany({ orderBy: { name: 'asc' } });
    },

    // Publiczny katalog Liderów (/liderzy) — tylko widoczne profile. Filtry: branża
    // + fraza (LIKE na nagłówku). Poziom Drabinki i oceny DOŁĄCZA warstwa route
    // (batch przez ladder/reviews) — tu tylko dane profilu, bez logiki poziomów.
    async listPublicLeaders(filters: LeaderFilters) {
      const where: Prisma.LeaderProfileWhereInput = {
        isVisible: true,
        ...(filters.industryId ? { industryId: filters.industryId } : {}),
        ...(filters.q ? { headline: { contains: filters.q } } : {}),
      };
      const rows = await prisma.leaderProfile.findMany({
        where,
        include: { industry: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: filters.limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > filters.limit;
      const page = hasMore ? rows.slice(0, filters.limit) : rows;
      const users = await identity.getPublicUsers(page.map((p) => p.userId));
      return {
        leaders: page.map((p) => ({
          id: p.id,
          userId: p.userId,
          displayName: users.get(p.userId)?.displayName ?? 'Lider',
          avatarFileId: users.get(p.userId)?.avatarFileId ?? null,
          headline: p.headline,
          industry: { name: p.industry.name, slug: p.industry.slug },
        })),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      };
    },

    async createProfile(userId, input) {
      await requireIndustry(input.industryId);
      try {
        const profile = await prisma.leaderProfile.create({
          data: {
            userId,
            industryId: input.industryId,
            headline: input.headline,
            bio: input.bio ?? null,
            isVisible: input.isVisible,
          },
        });
        return { id: profile.id };
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          throw new ConflictError('PROFILE_EXISTS', 'Masz już profil Lidera');
        }
        throw err;
      }
    },

    async updateProfile(userId, input) {
      const profile = await requireOwnProfile(userId);
      if (input.industryId) await requireIndustry(input.industryId);
      await prisma.leaderProfile.update({
        where: { id: profile.id },
        data: {
          industryId: input.industryId,
          headline: input.headline,
          bio: input.bio,
          isVisible: input.isVisible,
        },
      });
      return { id: profile.id };
    },

    async getMyProfile(userId) {
      return prisma.leaderProfile.findUnique({
        where: { userId },
        include: {
          industry: true,
          portfolioItems: { orderBy: { createdAt: 'desc' } },
        },
      });
    },

    async getPublicProfile(profileId) {
      const profile = await prisma.leaderProfile.findFirst({
        where: { id: profileId, isVisible: true },
        include: {
          industry: true,
          portfolioItems: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!profile) throw new NotFoundError('Profil Lidera nie istnieje lub jest ukryty');
      const users = await identity.getPublicUsers([profile.userId]);
      return {
        ...profile,
        displayName: users.get(profile.userId)?.displayName ?? 'Lider',
        avatarFileId: users.get(profile.userId)?.avatarFileId ?? null,
      };
    },

    async addPortfolioItem(userId, input) {
      const profile = await requireOwnProfile(userId);
      const count = await prisma.portfolioItem.count({
        where: { leaderProfileId: profile.id },
      });
      if (count >= MAX_PORTFOLIO_ITEMS) {
        throw new DomainError(
          'PORTFOLIO_LIMIT',
          `Portfolio może mieć maksymalnie ${MAX_PORTFOLIO_ITEMS} pozycji`,
          400,
        );
      }
      if (input.imageFileId && files) {
        await files.assertOwned(input.imageFileId, userId, 'PORTFOLIO');
      }
      const item = await prisma.portfolioItem.create({
        data: {
          leaderProfileId: profile.id,
          title: input.title,
          url: input.url ?? null,
          description: input.description ?? null,
          imageFileId: input.imageFileId ?? null,
        },
      });
      return { id: item.id };
    },

    async removePortfolioItem(userId, itemId) {
      const profile = await requireOwnProfile(userId);
      const result = await prisma.portfolioItem.deleteMany({
        where: { id: itemId, leaderProfileId: profile.id },
      });
      if (result.count === 0) throw new NotFoundError('Pozycja portfolio nie istnieje');
    },

    // Lejek (PL0): profil Lidera to etap między kontem a pierwszą akcją —
    // sama liczba w oknie, bez danych osoby (ADR-002: moduł liczy własną tabelę).
    async countProfilesCreatedBetween(from: Date, to: Date): Promise<number> {
      return prisma.leaderProfile.count({ where: { createdAt: { gte: from, lt: to } } });
    },
  };
}

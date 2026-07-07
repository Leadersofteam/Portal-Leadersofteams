import type {
  CreateLeaderProfileInput,
  PortfolioItemInput,
  UpdateLeaderProfileInput,
} from '@lot/contracts';

import type { PrismaClient } from '../../shared/db';
import { ConflictError, DomainError, NotFoundError } from '../../shared/errors';
import type { IdentityService } from '../identity/index';

const MAX_PORTFOLIO_ITEMS = 20;

export interface ProfilesService {
  listIndustries(): Promise<Array<{ id: string; name: string; slug: string }>>;
  createProfile(userId: string, input: CreateLeaderProfileInput): Promise<{ id: string }>;
  updateProfile(userId: string, input: UpdateLeaderProfileInput): Promise<{ id: string }>;
  getMyProfile(userId: string): Promise<unknown | null>;
  getPublicProfile(profileId: string): Promise<unknown>;
  addPortfolioItem(userId: string, input: PortfolioItemInput): Promise<{ id: string }>;
  removePortfolioItem(userId: string, itemId: string): Promise<void>;
}

export function createProfilesService(
  prisma: PrismaClient,
  identity: Pick<IdentityService, 'getPublicUsers'>,
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
      return { ...profile, displayName: users.get(profile.userId)?.displayName ?? 'Lider' };
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
      const item = await prisma.portfolioItem.create({
        data: {
          leaderProfileId: profile.id,
          title: input.title,
          url: input.url ?? null,
          description: input.description ?? null,
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
  };
}

import type { CreateCompanyInput, LoginInput, RegisterInput, SessionUser } from '@lot/contracts';

import type { PrismaClient } from '../../shared/db';
import { EmailTakenError, InvalidCredentialsError } from '../../shared/errors';
import { emitEvent } from '../../shared/outbox';
import { DUMMY_HASH_PROMISE, hashPassword, verifyPassword } from './password';

export interface PublicUser {
  id: string;
  displayName: string;
}

export interface CompanySummary {
  id: string;
  name: string;
}

export interface IdentityService {
  register(input: RegisterInput): Promise<SessionUser>;
  authenticate(input: LoginInput): Promise<SessionUser>;
  createCompany(ownerId: string, input: CreateCompanyInput): Promise<CompanySummary>;
  listCompanies(userId: string): Promise<Array<CompanySummary & { role: string }>>;
  // Publiczne API dla innych modułów (granice — ADR-002): odczyty tabel
  // identity wyłącznie przez te funkcje.
  isCompanyMember(userId: string, companyId: string): Promise<boolean>;
  getCompanyMemberUserIds(companyId: string): Promise<string[]>;
  getPublicUsers(userIds: string[]): Promise<Map<string, PublicUser>>;
  getPublicCompanies(companyIds: string[]): Promise<Map<string, CompanySummary>>;
  getCompanyMeta(companyId: string): Promise<(CompanySummary & { createdAt: Date }) | null>;
}

function toSessionUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export function createIdentityService(prisma: PrismaClient): IdentityService {
  return {
    async register(input) {
      const passwordHash = await hashPassword(input.password);
      try {
        const user = await prisma.user.create({
          data: {
            email: input.email,
            passwordHash,
            displayName: input.displayName,
          },
        });
        return toSessionUser(user);
      } catch (err: unknown) {
        // P2002 = naruszenie unikalności (wyścig dwóch rejestracji obsługuje DB).
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          throw new EmailTakenError();
        }
        throw err;
      }
    },

    async authenticate(input) {
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user) {
        // Wyrównanie czasu odpowiedzi — weryfikujemy hash-przynętę.
        await verifyPassword(await DUMMY_HASH_PROMISE, input.password);
        throw new InvalidCredentialsError();
      }
      const ok = await verifyPassword(user.passwordHash, input.password);
      if (!ok) throw new InvalidCredentialsError();
      return toSessionUser(user);
    },

    async createCompany(ownerId, input) {
      // Zmiana stanu + zdarzenie domenowe atomowo (wzorzec outbox, ADR-007).
      return prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: input.name,
            nip: input.nip ?? null,
            description: input.description ?? null,
            members: { create: { userId: ownerId, role: 'OWNER' } },
          },
        });
        await emitEvent(tx, 'identity.company_created', { companyId: company.id, ownerId });
        return { id: company.id, name: company.name };
      });
    },

    async listCompanies(userId) {
      const memberships = await prisma.companyMember.findMany({
        where: { userId },
        include: { company: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return memberships.map((m) => ({ id: m.company.id, name: m.company.name, role: m.role }));
    },

    async isCompanyMember(userId, companyId) {
      const member = await prisma.companyMember.findUnique({
        where: { companyId_userId: { companyId, userId } },
        select: { id: true },
      });
      return member !== null;
    },

    // Publiczne API dla notifications (granice — ADR-002): odbiorcy powiadomień
    // kierowanych „do firmy" (np. nowa oferta do zlecenia firmy).
    async getCompanyMemberUserIds(companyId) {
      const members = await prisma.companyMember.findMany({
        where: { companyId },
        select: { userId: true },
      });
      return members.map((m) => m.userId);
    },

    async getPublicUsers(userIds) {
      if (userIds.length === 0) return new Map();
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, displayName: true },
      });
      return new Map(users.map((u) => [u.id, { id: u.id, displayName: u.displayName }]));
    },

    async getPublicCompanies(companyIds) {
      if (companyIds.length === 0) return new Map();
      const companies = await prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      });
      return new Map(companies.map((c) => [c.id, { id: c.id, name: c.name }]));
    },

    async getCompanyMeta(companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, createdAt: true },
      });
      return company;
    },
  };
}

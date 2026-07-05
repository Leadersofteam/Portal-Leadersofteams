import type { CreateCompanyInput, LoginInput, RegisterInput, SessionUser } from '@lot/contracts';

import type { PrismaClient } from '../../shared/db';
import { EmailTakenError, InvalidCredentialsError } from '../../shared/errors';
import { DUMMY_HASH_PROMISE, hashPassword, verifyPassword } from './password';

export interface IdentityService {
  register(input: RegisterInput): Promise<SessionUser>;
  authenticate(input: LoginInput): Promise<SessionUser>;
  createCompany(ownerId: string, input: CreateCompanyInput): Promise<{ id: string; name: string }>;
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
        await tx.outboxEvent.create({
          data: {
            type: 'identity.company_created',
            payload: { companyId: company.id, ownerId },
          },
        });
        return { id: company.id, name: company.name };
      });
    },
  };
}

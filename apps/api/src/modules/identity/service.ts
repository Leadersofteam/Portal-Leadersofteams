import { createHash, randomBytes } from 'node:crypto';

import type { CreateCompanyInput, LoginInput, RegisterInput, SessionUser } from '@lot/contracts';

import type { PrismaClient } from '../../shared/db';
import { EmailTakenError, InvalidCredentialsError } from '../../shared/errors';
import type { MailService } from '../../shared/mail';
import { emitEvent } from '../../shared/outbox';
import type { SessionStore } from '../../shared/session';
import { DUMMY_HASH_PROMISE, hashPassword, verifyPassword } from './password';

export interface PublicUser {
  id: string;
  displayName: string;
  // Id pliku awatara (moduł files) — web buduje z niego /api/v1/files/:id/thumb.
  avatarFileId: string | null;
}

export interface CompanySummary {
  id: string;
  name: string;
}

// Kontrakt modułu na potrzeby RODO (D6): każdy moduł czyści/eksportuje WYŁĄCZNIE
// własne tabele (ADR-002). Orkiestruje identity, wstrzykując te providery.
export interface AccountDataModule {
  anonymizeUserContent(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<Record<string, unknown>>;
}

export interface IdentityDeps {
  sessions?: Pick<SessionStore, 'destroyAllForUser'>;
  accountModules?: AccountDataModule[];
  mail?: MailService;
  appBaseUrl?: string;
}

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

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
  // Awatar (moduł files ustawia po walidacji własności pliku).
  setAvatar(userId: string, fileId: string | null): Promise<void>;
  // Adresy e-mail (dla digestu powiadomień) — pomija konta zanonimizowane.
  getUserEmails(userIds: string[]): Promise<Map<string, string>>;
  getPublicCompanies(companyIds: string[]): Promise<Map<string, CompanySummary>>;
  getCompanyMeta(companyId: string): Promise<(CompanySummary & { createdAt: Date }) | null>;
  // Wiek konta użytkownika — dla progu dojrzałości głosu Q&A i limitów świeżych
  // kont (kwalifikacja/limit rozstrzygana w modułach; identity tylko dostarcza datę).
  getUserCreatedAt(userId: string): Promise<Date | null>;
  // RODO (D6): anonimizacja W MIEJSCU (ledger zachowany) + eksport danych.
  anonymizeAccount(userId: string): Promise<void>;
  exportAccount(userId: string): Promise<Record<string, unknown>>;
  // E-mail (D4): weryfikacja adresu i reset hasła (za flagą; wysyłka no-op gdy off).
  sendEmailVerification(userId: string, email: string): Promise<string>;
  verifyEmail(rawToken: string): Promise<{ verified: boolean }>;
  requestPasswordReset(email: string): Promise<{ rawToken: string | null }>;
  resetPassword(rawToken: string, newPassword: string): Promise<{ reset: boolean }>;
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

export function createIdentityService(
  prisma: PrismaClient,
  deps: IdentityDeps = {},
): IdentityService {
  const { sessions, accountModules = [], mail, appBaseUrl = 'http://localhost:3000' } = deps;

  const hashToken = (raw: string) => createHash('sha256').update(raw).digest('hex');

  async function createToken(
    userId: string,
    type: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
    ttlMs: number,
  ): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    await prisma.verificationToken.create({
      data: { userId, type, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + ttlMs) },
    });
    return raw;
  }

  async function sendVerification(userId: string, email: string): Promise<string> {
    const raw = await createToken(userId, 'EMAIL_VERIFY', EMAIL_VERIFY_TTL_MS);
    await mail?.send({
      to: email,
      subject: 'Potwierdź adres e-mail — Leaders of Teams',
      text: `Potwierdź swój adres, otwierając: ${appBaseUrl}/weryfikacja?token=${raw}`,
    });
    return raw;
  }

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
        // Miękka weryfikacja (MVP): auto-login, a gdy wysyłka włączona — mail.
        if (mail?.enabled) {
          try {
            await sendVerification(user.id, user.email);
          } catch {
            /* wysyłka best-effort — rejestracja nie może się wywalić na mailu */
          }
        }
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
        select: { id: true, displayName: true, avatarFileId: true },
      });
      return new Map(
        users.map((u) => [
          u.id,
          { id: u.id, displayName: u.displayName, avatarFileId: u.avatarFileId },
        ]),
      );
    },

    async setAvatar(userId, fileId) {
      // Własność pliku waliduje moduł files (route) — tu tylko własna tabela (ADR-002).
      await prisma.user.update({ where: { id: userId }, data: { avatarFileId: fileId } });
    },

    async getUserEmails(userIds) {
      if (userIds.length === 0) return new Map();
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, anonymizedAt: null },
        select: { id: true, email: true },
      });
      return new Map(users.map((u) => [u.id, u.email]));
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

    async getUserCreatedAt(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      return user?.createdAt ?? null;
    },

    // --- RODO (D6) ----------------------------------------------------------
    // Anonimizacja W MIEJSCU: konto traci PII, ale userId zostaje — append-only
    // ledger (point_events) jest nietknięty (integralność Drabinki, ADR-004).
    async anonymizeAccount(userId) {
      const anonEmail = `deleted-${randomBytes(8).toString('hex')}@deleted.invalid`;
      const passwordHash = await hashPassword(randomBytes(24).toString('hex'));
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            email: anonEmail,
            displayName: 'Użytkownik usunięty',
            passwordHash,
            anonymizedAt: new Date(),
            emailVerifiedAt: null,
          },
        });
        await tx.verificationToken.deleteMany({ where: { userId } });
      });
      // Każdy moduł czyści własne treści (granice ADR-002).
      for (const m of accountModules) await m.anonymizeUserContent(userId);
      // Natychmiastowe wylogowanie wszędzie.
      await sessions?.destroyAllForUser(userId);
    },

    async exportAccount(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
          emailVerifiedAt: true,
        },
      });
      const companyMemberships = await prisma.companyMember.findMany({
        where: { userId },
        include: { company: { select: { id: true, name: true, nip: true } } },
      });
      const modules: Record<string, unknown> = {};
      for (const m of accountModules) Object.assign(modules, await m.exportUserData(userId));
      return { exportedAt: new Date().toISOString(), user, companyMemberships, ...modules };
    },

    // --- E-mail (D4) --------------------------------------------------------
    sendEmailVerification(userId, email) {
      return sendVerification(userId, email);
    },

    async verifyEmail(rawToken) {
      const token = await prisma.verificationToken.findUnique({
        where: { tokenHash: hashToken(rawToken) },
      });
      const now = new Date();
      if (!token || token.type !== 'EMAIL_VERIFY' || token.usedAt || token.expiresAt < now) {
        return { verified: false };
      }
      await prisma.$transaction([
        prisma.verificationToken.update({ where: { id: token.id }, data: { usedAt: now } }),
        prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: now } }),
      ]);
      return { verified: true };
    },

    async requestPasswordReset(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      // Bez enumeracji: zawsze zwracamy sukces; token tylko dla istniejącego konta.
      if (!user || user.anonymizedAt) return { rawToken: null };
      const raw = await createToken(user.id, 'PASSWORD_RESET', PASSWORD_RESET_TTL_MS);
      await mail?.send({
        to: email,
        subject: 'Reset hasła — Leaders of Teams',
        text: `Ustaw nowe hasło, otwierając: ${appBaseUrl}/reset-hasla?token=${raw}`,
      });
      return { rawToken: raw };
    },

    async resetPassword(rawToken, newPassword) {
      const token = await prisma.verificationToken.findUnique({
        where: { tokenHash: hashToken(rawToken) },
      });
      const now = new Date();
      if (!token || token.type !== 'PASSWORD_RESET' || token.usedAt || token.expiresAt < now) {
        return { reset: false };
      }
      const passwordHash = await hashPassword(newPassword);
      await prisma.$transaction([
        prisma.verificationToken.update({ where: { id: token.id }, data: { usedAt: now } }),
        prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }),
      ]);
      // Reset hasła unieważnia istniejące sesje (bezpieczeństwo).
      await sessions?.destroyAllForUser(token.userId);
      return { reset: true };
    },
  };
}

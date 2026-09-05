import { createHash, randomBytes } from 'node:crypto';

import type {
  CreateCompanyInput,
  LoginInput,
  RegisterInput,
  SessionUser,
  UpdateOnboardingInput,
} from '@lot/contracts';

import type { PrismaClient } from '../../shared/db';
import {
  EmailTakenError,
  ForbiddenError,
  InvalidCredentialsError,
  NotFoundError,
} from '../../shared/errors';
import type { MailService } from '../../shared/mail';
import { emitEvent } from '../../shared/outbox';
import type { SessionStore } from '../../shared/session';
import { DUMMY_HASH_PROMISE, hashPassword, verifyPassword } from './password';

export interface PublicUser {
  id: string;
  displayName: string;
  // Id pliku awatara (moduł files) — web buduje z niego /api/v1/files/:id/thumb.
  avatarFileId: string | null;
  // Uchwyt @handle (moduł social) — null, dopóki nie wygenerowany.
  handle: string | null;
}

export interface CompanySummary {
  id: string;
  name: string;
  // Ustawione, gdy NIP przeszedł sumę kontrolną. UWAGA na copy w UI: to jest
  // poprawność FORMALNA, nie potwierdzenie istnienia firmy w rejestrze.
  nipVerifiedAt?: Date | null;
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
  // Uchwyty @handle (moduł social): leniwe generowanie + wyszukiwanie.
  ensureHandle(userId: string): Promise<string>;
  getUserIdByHandle(handle: string): Promise<string | null>;
  getUserIdsByHandles(handles: string[]): Promise<Map<string, string>>;
  // Adresy e-mail (dla digestu powiadomień) — pomija konta zanonimizowane.
  getUserEmails(userIds: string[]): Promise<Map<string, string>>;
  // Digest (19.08): odbiorcy dziennego digestu — bez zanonimizowanych i bez
  // wypisanych; token wypisu (dowód posiadania skrzynki) generowany leniwie
  // przy pierwszej wysyłce, żeby nie płodzić sekretów kontom, do których
  // nigdy nie piszemy.
  getDigestRecipients(userIds: string[]): Promise<Map<string, { email: string; token: string }>>;
  getDigestState(userId: string): Promise<{ optedOut: boolean }>;
  setDigestOptOut(userId: string, optedOut: boolean): Promise<void>;
  digestOptOutByToken(token: string): Promise<boolean>;
  // Administracja (19.08): nadawanie roli MODERATOR z UI zamiast SQL-em na
  // produkcji. ADMIN poza zasięgiem — patrz komentarz przy adminSetRoleInputSchema.
  listUsers(search?: string): Promise<AdminUserRow[]>;
  setUserRole(actorId: string, userId: string, role: 'USER' | 'MODERATOR'): Promise<void>;
  getPublicCompanies(companyIds: string[]): Promise<Map<string, CompanySummary>>;
  getCompanyMeta(companyId: string): Promise<(CompanySummary & { createdAt: Date }) | null>;
  // Wiek konta użytkownika — dla progu dojrzałości głosu Q&A i limitów świeżych
  // kont (kwalifikacja/limit rozstrzygana w modułach; identity tylko dostarcza datę).
  getUserCreatedAt(userId: string): Promise<Date | null>;
  // Analityka (S12): sama LICZBA rejestracji w oknie — bez żadnych danych osoby.
  countRegistrationsBetween(from: Date, to: Date): Promise<number>;
  // Lejek (PL0): potwierdzone adresy i założone firmy w oknie — same liczby.
  countVerifiedBetween(from: Date, to: Date): Promise<number>;
  countCompaniesCreatedBetween(from: Date, to: Date): Promise<number>;
  // RODO (D6): anonimizacja W MIEJSCU (ledger zachowany) + eksport danych.
  anonymizeAccount(userId: string): Promise<void>;
  exportAccount(userId: string): Promise<Record<string, unknown>>;
  // E-mail (D4): weryfikacja adresu i reset hasła (za flagą; wysyłka no-op gdy off).
  sendEmailVerification(userId: string, email: string): Promise<string>;
  /**
   * Stan potwierdzenia adresu — czytany Z BAZY, nie z migawki sesji.
   * Sesja jest zamrożona przy logowaniu (ta sama pułapka co z rolą MODERATOR),
   * więc gdyby baner zależał od sesji, nie zniknąłby po kliknięciu w link.
   */
  getVerificationStatus(userId: string): Promise<{ email: string; verified: boolean } | null>;
  verifyEmail(rawToken: string): Promise<{ verified: boolean }>;
  requestPasswordReset(email: string): Promise<{ rawToken: string | null }>;
  resetPassword(rawToken: string, newPassword: string): Promise<{ reset: boolean }>;
  // Pierwsza mila (S10) — czysty stan UI, bez zdarzeń i bez punktów.
  getOnboarding(userId: string): Promise<OnboardingState>;
  updateOnboarding(userId: string, input: UpdateOnboardingInput): Promise<OnboardingState>;
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  handle: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  createdAt: Date;
  emailVerifiedAt: Date | null;
}

export interface OnboardingState {
  step: number;
  intent: string | null;
  completedAt: Date | null;
  checklistDismissedAt: Date | null;
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
    // Treść, a nie sam link (S19 pkt 4). Poprzednia wersja była jedną linijką
    // z gołym adresem — dla kogoś, kto zakłada konto wieczorem i wraca za
    // tydzień, to wiadomość nie do odróżnienia od spamu. Pierwszy realny
    // Lider na produkcji nie kliknął w nią ani razu i token wygasł mu po dobie.
    // Mówimy więc wprost: skąd to jest, po co to jest i ile jest ważne.
    await mail?.send({
      to: email,
      subject: 'Potwierdź adres e-mail — Leaders of Teams',
      text: [
        'Cześć!',
        '',
        `Ktoś (mamy nadzieję, że Ty) założył konto na ${appBaseUrl} — portalu`,
        'Leaders of Teams. Potwierdź adres, żebyśmy mogli odzyskać Ci konto,',
        'gdy zapomnisz hasła:',
        '',
        `${appBaseUrl}/weryfikacja?token=${raw}`,
        '',
        'Link jest ważny przez dobę i działa jeden raz. Gdy wygaśnie, zaloguj',
        'się na swoje konto — poprosimy Cię tam o nowy jednym kliknięciem.',
        '',
        'Konto działa też bez potwierdzenia — nic Ci nie blokujemy.',
        '',
        'Jeśli to nie Ty zakładałeś konto, po prostu zignoruj tę wiadomość.',
        '',
        '— Leaders of Teams',
      ].join('\n'),
    });
    return raw;
  }

  // Generowanie unikatowego @handle z displayName (transliteracja PL + kolizje).
  // Wołane przy rejestracji (nowi userzy linkowalni od 1. dnia) i leniwie
  // przez moduł social dla kont sprzed tej zmiany.
  async function ensureHandleFor(userId: string): Promise<string> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { handle: true, displayName: true },
    });
    if (user.handle) return user.handle;
    const map: Record<string, string> = {
      ą: 'a',
      ć: 'c',
      ę: 'e',
      ł: 'l',
      ń: 'n',
      ó: 'o',
      ś: 's',
      ź: 'z',
      ż: 'z',
    };
    const base =
      user.displayName
        .toLowerCase()
        .replace(/[ąćęłńóśźż]/g, (ch) => map[ch] ?? ch)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'user';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = attempt === 0 ? '' : `-${Math.random().toString(36).slice(2, 6)}`;
      const candidate = `${base}${suffix}`;
      try {
        await prisma.user.update({ where: { id: userId }, data: { handle: candidate } });
        return candidate;
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          continue; // kolizja — próbuj z sufiksem
        }
        throw err;
      }
    }
    const fallback = `${base}-${userId.slice(-6)}`;
    await prisma.user.update({ where: { id: userId }, data: { handle: fallback } });
    return fallback;
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
        // Nowi użytkownicy dostają @handle od razu (profil linkowalny od 1. dnia).
        try {
          await ensureHandleFor(user.id);
        } catch {
          /* best-effort — moduł social nada leniwie przy pierwszym follow */
        }
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
            // Kontrakt (`createCompanyInputSchema`) już odrzucił numer z błędną
            // sumą kontrolną, więc obecność NIP-u tutaj ZNACZY, że przeszedł.
            // Zapisujemy znacznik, zamiast przeliczać sumę przy każdym renderze.
            nipVerifiedAt: input.nip ? new Date() : null,
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
        include: { company: { select: { id: true, name: true, nipVerifiedAt: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return memberships.map((m) => ({
        id: m.company.id,
        name: m.company.name,
        nipVerifiedAt: m.company.nipVerifiedAt,
        role: m.role,
      }));
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
        select: { id: true, displayName: true, avatarFileId: true, handle: true },
      });
      return new Map(
        users.map((u) => [
          u.id,
          { id: u.id, displayName: u.displayName, avatarFileId: u.avatarFileId, handle: u.handle },
        ]),
      );
    },

    async setAvatar(userId, fileId) {
      // Własność pliku waliduje moduł files (route) — tu tylko własna tabela (ADR-002).
      await prisma.user.update({ where: { id: userId }, data: { avatarFileId: fileId } });
    },

    // Leniwe generowanie uchwytu @handle (logika w ensureHandleFor wyżej).
    async ensureHandle(userId) {
      return ensureHandleFor(userId);
    },

    async getUserIdByHandle(handle) {
      const user = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
      return user?.id ?? null;
    },

    async getUserIdsByHandles(handles) {
      if (handles.length === 0) return new Map();
      const users = await prisma.user.findMany({
        where: { handle: { in: handles }, anonymizedAt: null },
        select: { id: true, handle: true },
      });
      return new Map(users.filter((u) => u.handle).map((u) => [u.handle!, u.id]));
    },

    async getUserEmails(userIds) {
      if (userIds.length === 0) return new Map();
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, anonymizedAt: null },
        select: { id: true, email: true },
      });
      return new Map(users.map((u) => [u.id, u.email]));
    },

    async getDigestRecipients(userIds) {
      if (userIds.length === 0) return new Map();
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, anonymizedAt: null, digestOptOutAt: null },
        select: { id: true, email: true, digestToken: true },
      });
      const recipients = new Map<string, { email: string; token: string }>();
      for (const user of users) {
        let token = user.digestToken;
        if (!token) {
          token = randomBytes(24).toString('base64url');
          await prisma.user.update({ where: { id: user.id }, data: { digestToken: token } });
        }
        recipients.set(user.id, { email: user.email, token });
      }
      return recipients;
    },

    async getDigestState(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { digestOptOutAt: true },
      });
      return { optedOut: user?.digestOptOutAt != null };
    },

    async setDigestOptOut(userId, optedOut) {
      await prisma.user.update({
        where: { id: userId },
        data: { digestOptOutAt: optedOut ? new Date() : null },
      });
    },

    async digestOptOutByToken(token) {
      // updateMany zamiast find+update: idempotentnie i bez wyścigu. Token to
      // dowód posiadania skrzynki — sesja nie jest tu wymagana, bo wypis musi
      // działać jednym kliknięciem prosto z maila.
      const result = await prisma.user.updateMany({
        where: { digestToken: token, anonymizedAt: null },
        data: { digestOptOutAt: new Date() },
      });
      return result.count > 0;
    },

    async listUsers(search) {
      const query = search?.trim();
      return prisma.user.findMany({
        where: {
          anonymizedAt: null,
          ...(query
            ? {
                OR: [
                  { email: { contains: query } },
                  { displayName: { contains: query } },
                  { handle: { contains: query } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          handle: true,
          role: true,
          createdAt: true,
          emailVerifiedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        // Twardy limit z komunikatem po stronie UI — obcięcie listy nie może
        // być ciche, ale przy 50+ kontach admin i tak szuka po frazie.
        take: 50,
      });
    },

    async setUserRole(actorId, userId, role) {
      if (actorId === userId) {
        throw new ForbiddenError(
          'SELF_ROLE',
          'Własnej roli nie zmienisz — poproś drugiego admina.',
        );
      }
      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, anonymizedAt: true },
      });
      if (!target || target.anonymizedAt) throw new NotFoundError('Nie ma takiego konta');
      // ADMIN poza zasięgiem tras administracyjnych: przejęte konto admina nie
      // może ani mianować kolejnych adminów, ani zdegradować istniejącego.
      if (target.role === 'ADMIN' || role === ('ADMIN' as string)) {
        throw new ForbiddenError('ADMIN_IMMUTABLE', 'Rolą ADMIN zarządza się poza aplikacją.');
      }
      await prisma.user.update({ where: { id: userId }, data: { role } });
      // Rola jest ZAMROŻONA w sesji przy logowaniu (pułapka z S12) — bez
      // unieważnienia sesji świeżo mianowany moderator nie zobaczyłby
      // /panel/moderacja aż do samodzielnego wylogowania.
      await sessions?.destroyAllForUser(userId);
    },

    async getPublicCompanies(companyIds) {
      if (companyIds.length === 0) return new Map();
      const companies = await prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true, nipVerifiedAt: true },
      });
      return new Map(
        companies.map((c) => [c.id, { id: c.id, name: c.name, nipVerifiedAt: c.nipVerifiedAt }]),
      );
    },

    async getCompanyMeta(companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, createdAt: true, nipVerifiedAt: true },
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

    // Analityka (S12) — moduł liczy własną tabelę i oddaje samą liczbę (ADR-002).
    // Konta zanonimizowane (RODO, D6) zostają w liczniku: rejestracja się wydarzyła,
    // a licznik nie mówi KTO ani nie pozwala nikogo wskazać.
    async countRegistrationsBetween(from, to) {
      return prisma.user.count({ where: { createdAt: { gte: from, lt: to } } });
    },

    async countVerifiedBetween(from, to) {
      return prisma.user.count({ where: { emailVerifiedAt: { gte: from, lt: to } } });
    },

    async countCompaniesCreatedBetween(from, to) {
      return prisma.company.count({ where: { createdAt: { gte: from, lt: to } } });
    },

    // --- pierwsza mila (S10) -------------------------------------------------

    async getOnboarding(userId) {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          onboardingStep: true,
          onboardingIntent: true,
          onboardingCompletedAt: true,
          checklistDismissedAt: true,
        },
      });
      return {
        step: user.onboardingStep,
        intent: user.onboardingIntent,
        completedAt: user.onboardingCompletedAt,
        checklistDismissedAt: user.checklistDismissedAt,
      };
    },

    /**
     * ANTY-MLM Z ARCHITEKTURY, NIE Z REGULAMINU (ADR-004).
     *
     * Ta funkcja robi WYŁĄCZNIE `prisma.user.update` — ani jednego `emitEvent`.
     * Brak zdarzenia oznacza, że nie istnieje żadna droga, którą ukończenie
     * kreatora czy odhaczenie checklisty mogłoby dosypać punktów w Drabince:
     * ladder konsumuje zdarzenia, a tutaj żadne nie powstaje. Jeśli kiedyś
     * ktoś zechce „nagrodzić za onboarding" — to jest właśnie miejsce, w którym
     * trzeba się zatrzymać i przeczytać brief §6.
     *
     * Kreator to mapa, nie nagroda.
     */
    async updateOnboarding(userId, input) {
      const now = new Date();
      const current = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { onboardingCompletedAt: true, checklistDismissedAt: true },
      });

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.step !== undefined ? { onboardingStep: input.step } : {}),
          ...(input.intent !== undefined ? { onboardingIntent: input.intent } : {}),
          // Idempotentnie: raz ustawiony znacznik ukończenia się nie przesuwa.
          ...(input.completed && !current.onboardingCompletedAt
            ? { onboardingCompletedAt: now, onboardingStep: 4 }
            : {}),
          ...(input.dismissChecklist && !current.checklistDismissedAt
            ? { checklistDismissedAt: now }
            : {}),
        },
        select: {
          onboardingStep: true,
          onboardingIntent: true,
          onboardingCompletedAt: true,
          checklistDismissedAt: true,
        },
      });

      return {
        step: user.onboardingStep,
        intent: user.onboardingIntent,
        completedAt: user.onboardingCompletedAt,
        checklistDismissedAt: user.checklistDismissedAt,
      };
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
    async getVerificationStatus(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerifiedAt: true },
      });
      if (!user) return null;
      return { email: user.email, verified: user.emailVerifiedAt !== null };
    },

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

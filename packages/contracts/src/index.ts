import { z } from 'zod';

// ---------------------------------------------------------------------------
// Wspólne
// ---------------------------------------------------------------------------

export const idSchema = z.string().cuid();

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ---------------------------------------------------------------------------
// Auth / Identity
// ---------------------------------------------------------------------------

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Nieprawidłowy adres e-mail')
  .max(254);

// Zgodnie z zaleceniami OWASP/NIST: długość zamiast reguł znakowych.
export const passwordSchema = z
  .string()
  .min(10, 'Hasło musi mieć co najmniej 10 znaków')
  .max(128, 'Hasło może mieć maksymalnie 128 znaków');

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Nazwa musi mieć co najmniej 2 znaki')
  .max(80);

export const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

// Weryfikacja e-mail i reset hasła (D4, e-mail za flagą).
export const verifyEmailInputSchema = z.object({ token: z.string().min(10).max(200) });
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;

export const requestPasswordResetInputSchema = z.object({ email: emailSchema });
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetInputSchema>;

export const resetPasswordInputSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

export const userRoleSchema = z.enum(['USER', 'MODERATOR', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const sessionUserSchema = z.object({
  id: idSchema,
  email: emailSchema,
  displayName: z.string(),
  role: userRoleSchema,
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

// ---------------------------------------------------------------------------
// Firma
// ---------------------------------------------------------------------------

export const createCompanyInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  // NIP opcjonalny na starcie (brak weryfikacji Firm — brief 3.4);
  // pole gotowe pod przyszłą weryfikację-odznakę.
  nip: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'NIP musi składać się z 10 cyfr')
    .optional(),
  description: z.string().trim().max(2000).optional(),
});
export type CreateCompanyInput = z.infer<typeof createCompanyInputSchema>;

export const companySchema = z.object({
  id: idSchema,
  name: z.string(),
  nip: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type Company = z.infer<typeof companySchema>;

// ---------------------------------------------------------------------------
// Marketplace — profile Liderów
// ---------------------------------------------------------------------------

export const industrySchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: z.string(),
});
export type Industry = z.infer<typeof industrySchema>;

export const createLeaderProfileInputSchema = z.object({
  industryId: idSchema,
  headline: z.string().trim().min(5, 'Nagłówek: min. 5 znaków').max(120),
  bio: z.string().trim().max(5000).optional(),
  isVisible: z.boolean().default(true),
});
export type CreateLeaderProfileInput = z.infer<typeof createLeaderProfileInputSchema>;

export const updateLeaderProfileInputSchema = createLeaderProfileInputSchema.partial();
export type UpdateLeaderProfileInput = z.infer<typeof updateLeaderProfileInputSchema>;

export const portfolioItemInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  url: z.string().trim().url('Nieprawidłowy adres URL').max(500).optional(),
  description: z.string().trim().max(1000).optional(),
});
export type PortfolioItemInput = z.infer<typeof portfolioItemInputSchema>;

// ---------------------------------------------------------------------------
// Marketplace — zlecenia i oferty
// ---------------------------------------------------------------------------

// Cykl życia zlecenia (ADR-006): lead-gen z formalnym przepływem.
export const orderStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'AWARDED',
  'IN_PROGRESS',
  'DELIVERED',
  'CONFIRMED',
  'CANCELLED',
  'DISPUTED',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const offerStatusSchema = z.enum(['SUBMITTED', 'WITHDRAWN', 'ACCEPTED', 'REJECTED']);
export type OfferStatus = z.infer<typeof offerStatusSchema>;

const orderCoreShape = {
  title: z.string().trim().min(5, 'Tytuł: min. 5 znaków').max(140),
  description: z.string().trim().min(20, 'Opis: min. 20 znaków').max(10000),
  industryId: idSchema,
  budgetMin: z.number().int().min(0),
  budgetMax: z.number().int().min(0),
  // Mechanizm „małe zlecenia na start" (brief 3.2): widoczność/ofertowanie
  // od zadanego poziomu Drabinki.
  minLevel: z.number().int().min(0).max(7).default(0),
};

export const createOrderInputSchema = z
  .object({ companyId: idSchema, ...orderCoreShape })
  .refine((v) => v.budgetMax >= v.budgetMin, {
    message: 'Budżet maksymalny nie może być niższy niż minimalny',
    path: ['budgetMax'],
  });
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderInputSchema = z
  .object(orderCoreShape)
  .partial()
  .refine(
    (v) => v.budgetMin === undefined || v.budgetMax === undefined || v.budgetMax >= v.budgetMin,
    {
      message: 'Budżet maksymalny nie może być niższy niż minimalny',
      path: ['budgetMax'],
    },
  );
export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;

export const orderFiltersSchema = z.object({
  industryId: idSchema.optional(),
  maxMinLevel: z.coerce.number().int().min(0).max(7).optional(),
  budgetMin: z.coerce.number().int().min(0).optional(),
  budgetMax: z.coerce.number().int().min(0).optional(),
  q: z.string().trim().min(2).max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type OrderFilters = z.infer<typeof orderFiltersSchema>;

// Filtry publicznego katalogu Liderów (/liderzy). Poziom Drabinki jest
// DOŁĄCZANY do wyświetlenia; filtrowanie/ranking po poziomie żyje w module ladder
// (patrz /liderzy/rankingi), by nie mieszać logiki poziomów do marketplace.
export const leaderFiltersSchema = z.object({
  industryId: idSchema.optional(),
  q: z.string().trim().min(2).max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type LeaderFilters = z.infer<typeof leaderFiltersSchema>;

export const createOfferInputSchema = z.object({
  message: z.string().trim().min(20, 'Wiadomość: min. 20 znaków').max(5000),
  proposedBudget: z.number().int().min(0).optional(),
  proposedDays: z.number().int().min(1).max(365).optional(),
});
export type CreateOfferInput = z.infer<typeof createOfferInputSchema>;

// ---------------------------------------------------------------------------
// Oceny i Drabinka
// ---------------------------------------------------------------------------

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1, 'Ocena 1–5').max(5, 'Ocena 1–5'),
  comment: z.string().trim().max(2000).optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const pointEventStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'HOLD', 'REVERSED']);
export type PointEventStatus = z.infer<typeof pointEventStatusSchema>;

export const moderationResolveInputSchema = z.object({
  action: z.enum(['RELEASE', 'REJECT']),
  note: z.string().trim().min(5, 'Uzasadnienie: min. 5 znaków').max(2000),
});
export type ModerationResolveInput = z.infer<typeof moderationResolveInputSchema>;

// Zgłoszenie treści przez użytkownika (D7) → ModerationCase źródło REPORT.
export const reportSubjectTypeSchema = z.enum(['POST', 'THREAD', 'ORDER']);
export type ReportSubjectType = z.infer<typeof reportSubjectTypeSchema>;

export const reportInputSchema = z.object({
  subjectType: reportSubjectTypeSchema,
  subjectId: idSchema,
  reason: z.string().trim().min(5, 'Powód: min. 5 znaków').max(2000),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

// ---------------------------------------------------------------------------
// Grupy branżowe (moduł groups, ADR-010) — „portal jak Facebook".
// UWAGA (anty-MLM, ADR-004/010): żadna aktywność tu nie generuje punktów.
// ---------------------------------------------------------------------------

export const groupTypeSchema = z.enum(['OPEN', 'MODERATED']);
export type GroupType = z.infer<typeof groupTypeSchema>;

export const postTypeSchema = z.enum(['DISCUSSION', 'CASE_STUDY', 'IDEA']);
export type PostType = z.infer<typeof postTypeSchema>;

export const createGroupInputSchema = z.object({
  name: z.string().trim().min(3, 'Nazwa: min. 3 znaki').max(120),
  description: z.string().trim().max(2000).optional(),
  industryId: idSchema.optional(),
  type: groupTypeSchema.default('OPEN'),
});
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;

export const groupFiltersSchema = z.object({
  industryId: idSchema.optional(),
  q: z.string().trim().min(2).max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type GroupFilters = z.infer<typeof groupFiltersSchema>;

export const createPostInputSchema = z.object({
  type: postTypeSchema.default('DISCUSSION'),
  title: z.string().trim().min(5, 'Tytuł: min. 5 znaków').max(140),
  body: z.string().trim().min(10, 'Treść: min. 10 znaków').max(20000),
});
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export const feedFiltersSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type FeedFilters = z.infer<typeof feedFiltersSchema>;

export const createCommentInputSchema = z.object({
  body: z.string().trim().min(1, 'Komentarz nie może być pusty').max(5000),
  // Wątkowanie 1 poziom (ADR-010): odpowiedź wskazuje komentarz nadrzędny.
  parentId: idSchema.optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

// ---------------------------------------------------------------------------
// Community — Q&A / mentoring (moduł community, ADR-010 / brief 3.3).
// DRUGA, PUNKTOWANA ścieżka awansu: zaakceptowana odpowiedź i kwalifikowany
// upvote zasilają Drabinkę (community.* → ladder). Wątki żyją w grupach.
// ---------------------------------------------------------------------------

export const threadStatusSchema = z.enum(['OPEN', 'ANSWERED', 'CLOSED']);
export type ThreadStatus = z.infer<typeof threadStatusSchema>;

export const createThreadInputSchema = z.object({
  title: z.string().trim().min(5, 'Tytuł pytania: min. 5 znaków').max(200),
  body: z.string().trim().min(10, 'Treść pytania: min. 10 znaków').max(10000),
});
export type CreateThreadInput = z.infer<typeof createThreadInputSchema>;

export const createAnswerInputSchema = z.object({
  body: z.string().trim().min(10, 'Odpowiedź: min. 10 znaków').max(10000),
});
export type CreateAnswerInput = z.infer<typeof createAnswerInputSchema>;

export const threadFiltersSchema = z.object({
  status: threadStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ThreadFilters = z.infer<typeof threadFiltersSchema>;

// ---------------------------------------------------------------------------
// Powiadomienia (moduł notifications)
// ---------------------------------------------------------------------------

export const notificationsFiltersSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type NotificationsFilters = z.infer<typeof notificationsFiltersSchema>;

export const notificationsReadInputSchema = z
  .object({
    ids: z.array(idSchema).max(200).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => v.all === true || (v.ids !== undefined && v.ids.length > 0), {
    message: 'Podaj listę id lub all=true',
    path: ['ids'],
  });
export type NotificationsReadInput = z.infer<typeof notificationsReadInputSchema>;

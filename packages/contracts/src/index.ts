import { z } from 'zod';

// ---------------------------------------------------------------------------
// Wspólne
// ---------------------------------------------------------------------------

export const idSchema = z.string().cuid();

// Maksymalna liczba obrazów przy jednej treści (wpis portalowy, post w grupie).
// Limit świadomy: więcej nie mieści się w siatce na 390 px bez zamiany feedu
// w galerię. Stała stoi TUTAJ, w sekcji wspólnej, bo używają jej schematy
// z dwóch różnych miejsc pliku — a `const` nie jest hoistowany, więc przy
// definicji niżej pierwsze użycie wywracało moduł na starcie.
export const SOCIAL_POST_MAX_IMAGES = 4;

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

// ---------------------------------------------------------------------------
// NIP — walidacja sumy kontrolnej (offline, 0 zł — ADR-009)
//
// UWAGA CO DOKŁADNIE SPRAWDZAMY: to jest wyłącznie poprawność FORMALNA numeru
// (algorytm wagowy mod 11), a NIE potwierdzenie, że firma istnieje i jest
// czynnym podatnikiem. Dlatego etykieta w UI musi brzmieć „NIP — suma kontrolna
// OK", nigdy „NIP zweryfikowany": marka Portalu stoi na „dowód, nie deklaracja",
// więc nie wolno nam sugerować weryfikacji rejestrowej, której nie robimy.
// Weryfikacja w Białej Liście MF dojdzie, gdy potwierdzimy limity darmowego API.
// ---------------------------------------------------------------------------

const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7] as const;

export function isValidNip(nip: string): boolean {
  const digits = nip.replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(digits)) return false;
  const sum = NIP_WEIGHTS.reduce((acc, weight, i) => acc + weight * Number(digits[i]), 0);
  const check = sum % 11;
  // Reszta 10 nie ma reprezentacji jako cyfra kontrolna — taki numer jest błędny.
  return check !== 10 && check === Number(digits[9]);
}

export const createCompanyInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  // NIP opcjonalny na starcie (brak weryfikacji Firm — brief 3.4);
  // pole gotowe pod przyszłą weryfikację-odznakę.
  nip: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'NIP musi składać się z 10 cyfr')
    .refine(isValidNip, 'Nieprawidłowy NIP — błędna suma kontrolna')
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
  // Obraz z modułu files (upload przez POST /files, kind=PORTFOLIO).
  imageFileId: z.string().optional(),
});
export type PortfolioItemInput = z.infer<typeof portfolioItemInputSchema>;

// ---------------------------------------------------------------------------
// Files — upload obrazów (awatary, portfolio, galerie usług)
// ---------------------------------------------------------------------------

export const fileKindSchema = z.enum(['AVATAR', 'PORTFOLIO', 'LISTING', 'SOCIAL']);
export type FileKind = z.infer<typeof fileKindSchema>;

export const uploadedFileSchema = z.object({
  id: z.string(),
  kind: fileKindSchema,
  originalName: z.string(),
  mime: z.string(),
  size: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
});
export type UploadedFileDto = z.infer<typeof uploadedFileSchema>;

/** Publiczny URL wariantu pliku (thumb 320 px / full 1280 px). */
export function fileVariantUrl(fileId: string, variant: 'thumb' | 'full'): string {
  return `/api/v1/files/${fileId}/${variant}`;
}

// ---------------------------------------------------------------------------
// Listings — Usługi Liderów (Fiverr-lite; ceny DEKLARATYWNE — ADR-006)
// ---------------------------------------------------------------------------

export const packageTierSchema = z.enum(['BASIC', 'STANDARD', 'PREMIUM']);
export type PackageTier = z.infer<typeof packageTierSchema>;

export const listingStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED']);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const listingPackageInputSchema = z.object({
  tier: packageTierSchema,
  name: z.string().trim().min(2).max(80),
  // Deklarowana cena w PLN (całe złote) — informacja, nie płatność.
  priceDeclared: z.number().int().min(1).max(1_000_000),
  scope: z.string().trim().min(10, 'Opisz zakres: min. 10 znaków').max(2000),
  deliveryDays: z.number().int().min(1).max(365),
});
export type ListingPackageInput = z.infer<typeof listingPackageInputSchema>;

const listingCoreShape = {
  industryId: idSchema,
  title: z.string().trim().min(10, 'Tytuł: min. 10 znaków').max(120),
  description: z.string().trim().min(50, 'Opis: min. 50 znaków').max(10_000),
  tags: z.array(z.string().trim().min(2).max(30)).max(5).default([]),
  packages: z
    .array(listingPackageInputSchema)
    .min(1, 'Dodaj przynajmniej jeden pakiet')
    .max(3)
    .refine((p) => new Set(p.map((x) => x.tier)).size === p.length, {
      message: 'Każdy pakiet musi mieć inny poziom (BASIC/STANDARD/PREMIUM)',
    }),
  imageFileIds: z.array(z.string()).max(6).default([]),
};

export const createListingInputSchema = z.object(listingCoreShape);
export type CreateListingInput = z.infer<typeof createListingInputSchema>;

export const updateListingInputSchema = z.object(listingCoreShape).partial();
export type UpdateListingInput = z.infer<typeof updateListingInputSchema>;

// Sortowanie tylko po polach SQL-owalnych z kursorem (rating liczy się per
// Lider poza tym modułem — świadomie poza enum, żeby nie kłamać paginacją).
export const listingSortSchema = z.enum(['newest', 'price_asc', 'price_desc']).default('newest');
export type ListingSort = z.infer<typeof listingSortSchema>;

export const listingFiltersSchema = z.object({
  industryId: idSchema.optional(),
  tag: z.string().trim().min(2).max(30).optional(),
  q: z.string().trim().min(2).max(200).optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  minLevel: z.coerce.number().int().min(1).max(7).optional(),
  sort: listingSortSchema,
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListingFilters = z.infer<typeof listingFiltersSchema>;

export const createInquiryInputSchema = z.object({
  companyId: idSchema,
  message: z.string().trim().min(20, 'Wiadomość: min. 20 znaków').max(5000),
  // Pakiet, o który pyta Firma (opcjonalnie — kontekst dla Lidera).
  packageTier: packageTierSchema.optional(),
});
export type CreateInquiryInput = z.infer<typeof createInquiryInputSchema>;

export const inquiryMessageInputSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type InquiryMessageInput = z.infer<typeof inquiryMessageInputSchema>;

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

// Sprawy moderacyjne mają DWA różne światy i do S12 obsługiwała je jedna para
// akcji, przez co panel oferował „Zwolnij punkty"/„Odrzuć punkty" także przy
// zgłoszeniu treści, w którym żadnych punktów nie ma. Etykieta kłamała, a akcja
// po cichu zamykała sprawę nie robiąc nic z treścią.
//
//  - RELEASE / REJECT — sprawy punktowe (źródło FRAUD_SIGNAL): zwolnienie punktu
//    do karencji albo trwałe cofnięcie. Wymagają `pointEventId`.
//  - HIDE / DISMISS   — zgłoszenia treści (źródło REPORT): ukrycie zgłoszonej
//    treści albo zamknięcie sprawy bez działania.
export const moderationResolveInputSchema = z.object({
  action: z.enum(['RELEASE', 'REJECT', 'HIDE', 'DISMISS']),
  note: z.string().trim().min(5, 'Uzasadnienie: min. 5 znaków').max(2000),
});
export type ModerationResolveInput = z.infer<typeof moderationResolveInputSchema>;
export type ModerationAction = ModerationResolveInput['action'];

// Podgląd zgłoszonej treści dołączany do sprawy (S12) — front buduje z tego
// link do treści i pokazuje fragment, żeby moderator nie decydował w ciemno.
export interface ModerationSubjectView {
  exists: boolean;
  hidden: boolean;
  title: string | null;
  excerpt: string | null;
  authorUserId: string | null;
  authorDisplayName: string | null;
  context?: { groupId?: string };
  /** Czy dla tego typu treści w ogóle istnieje akcja „ukryj". */
  canHide: boolean;
}

// Zgłoszenie treści przez użytkownika (D7) → ModerationCase źródło REPORT.
// SOCIAL_POST jest osobnym typem, a nie POST: id wpisu portalowego wskazuje
// tabelę social_posts, więc wrzucenie go pod „POST" kierowałoby moderatora do
// nieistniejącego posta w grupie.
// Bramka człowieka (własna, po wykluczeniu Cloudflare) — rozwiązanie zagadki
// proof-of-work dołączane do rejestracji. `id` wskazuje wyzwanie w Redisie,
// `number` to znaleziona liczba. Szczegóły: apps/api/src/shared/humancheck.ts.
export const humancheckSolutionSchema = z.object({
  id: z.string().min(1).max(64),
  number: z.number().int().min(0),
});
export type HumancheckSolution = z.infer<typeof humancheckSolutionSchema>;

export interface HumancheckChallenge {
  id: string;
  salt: string;
  target: string;
  maxNumber: number;
}

export const reportSubjectTypeSchema = z.enum(['POST', 'THREAD', 'ORDER', 'SOCIAL_POST']);
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
  // Obrazy przy poście w grupie (S17) — ten sam limit i ta sama mechanika
  // co przy wpisie portalowym. Dyskusja branżowa bez możliwości pokazania
  // zrzutu albo schematu jest kaleka.
  imageFileIds: z.array(idSchema).max(SOCIAL_POST_MAX_IMAGES).optional(),
});
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export const updatePostInputSchema = z
  .object({
    title: z.string().trim().min(5, 'Tytuł: min. 5 znaków').max(140),
    body: z.string().trim().min(10, 'Treść: min. 10 znaków').max(20000),
  })
  .partial()
  .refine((v) => v.title !== undefined || v.body !== undefined, {
    message: 'Podaj tytuł lub treść do zmiany',
  });
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;

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

// Moderatorzy grup jako PIERWSZA LINIA (S17). Rola istniała w schemacie od
// Sprintu 4, ale używała jej wyłącznie akceptacja wniosków o członkostwo —
// grupa nie miała jak awansować moderatora ani zdjąć treści u siebie.
export const groupMemberRoleSchema = z.enum(['MEMBER', 'MODERATOR']);
export type GroupMemberRole = z.infer<typeof groupMemberRoleSchema>;

export const updateMembershipRoleInputSchema = z.object({ role: groupMemberRoleSchema });
export type UpdateMembershipRoleInput = z.infer<typeof updateMembershipRoleInputSchema>;

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

// ---------------------------------------------------------------------------
// Social — wpis portalowy (moduł social, X-lite wg ADR-010)
//
// Krótka notka bez tytułu: to nie jest post w grupie (tam jest tytuł, typ
// i moderacja grupowa), tylko wpis „co u mnie" do obserwujących. Limit 600
// znaków jest celowy — zmusza do konkretu i trzyma feed czytelnym na 390 px.
// ZERO punktów za cokolwiek tutaj (ADR-004).
// ---------------------------------------------------------------------------

export const socialPostBodySchema = z
  .string()
  .trim()
  .min(1, 'Wpis nie może być pusty')
  .max(600, 'Wpis: maksymalnie 600 znaków');

// Treść wpisu, gdy niesie go obraz albo cytat — wtedy sam tekst może być pusty
// (udostępnienie czyjegoś wpisu bez komentarza to normalny gest, nie błąd).
export const socialPostBodyOptionalSchema = z
  .string()
  .trim()
  .max(600, 'Wpis: maksymalnie 600 znaków');

export const createSocialPostInputSchema = z.object({
  // Tekst może być pusty, JEŚLI wpis niesie obraz albo cytat — udostępnienie
  // czyjegoś wpisu bez własnego komentarza to normalny gest. Warunek „coś musi
  // być" egzekwuje serwis, bo zod nie widzi tu relacji między polami czytelnie.
  body: socialPostBodyOptionalSchema,
  imageFileIds: z.array(idSchema).max(SOCIAL_POST_MAX_IMAGES).optional(),
  // „Podaj dalej z komentarzem" — cytowany wpis. Cytowanie NIE DAJE PUNKTÓW
  // (ADR-004): to sposób, żeby dwadzieścia osób mogło się nawzajem wzmacniać
  // bez DM-ów, a nie kolejna waluta do farmienia.
  quotedPostId: idSchema.optional(),
});
export type CreateSocialPostInput = z.infer<typeof createSocialPostInputSchema>;

export const updateSocialPostInputSchema = z.object({ body: socialPostBodySchema });
export type UpdateSocialPostInput = z.infer<typeof updateSocialPostInputSchema>;

export const createSocialCommentInputSchema = z.object({
  body: z.string().trim().min(1, 'Komentarz nie może być pusty').max(2000),
  // Wątkowanie 1 poziom — jak w grupach.
  parentId: idSchema.optional(),
});
export type CreateSocialCommentInput = z.infer<typeof createSocialCommentInputSchema>;

// Zakres feedu: obserwowani (wymaga sesji) albo cała społeczność (także dla
// gościa — pusty rynek nie wybacza ekranu logowania jako pierwszego wrażenia).
export const feedScopeSchema = z.enum(['following', 'all']).default('following');
export type FeedScope = z.infer<typeof feedScopeSchema>;

export const feedQuerySchema = z.object({
  scope: feedScopeSchema,
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type FeedQuery = z.infer<typeof feedQuerySchema>;

// Zakładki (S17) — PRYWATNA półka „na później". Te same dwa rodzaje treści co
// przy tematach: wpis portalowy i post w grupie. ADR-010: nigdzie nie ma i nie
// będzie liczby zapisań — zakładka jest dla jednej osoby, nie sygnałem dla tłumu.
export const bookmarkSubjectTypeSchema = z.enum(['SOCIAL_POST', 'POST']);
export type BookmarkSubjectType = z.infer<typeof bookmarkSubjectTypeSchema>;

export const bookmarksQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type BookmarksQuery = z.infer<typeof bookmarksQuerySchema>;

// ---------------------------------------------------------------------------
// Onboarding — pierwsza mila (S10)
//
// To WYŁĄCZNIE stan interfejsu: który krok kreatora, jaka intencja, czy
// checklista schowana. Zero związku z punktacją — patrz komentarz nad
// updateOnboarding w modules/identity/service.ts.
// ---------------------------------------------------------------------------

export const onboardingIntentSchema = z.enum(['LEADER', 'COMPANY', 'BOTH']);
export type OnboardingIntent = z.infer<typeof onboardingIntentSchema>;

export const updateOnboardingInputSchema = z
  .object({
    step: z.coerce.number().int().min(0).max(4).optional(),
    intent: onboardingIntentSchema.optional(),
    completed: z.boolean().optional(),
    dismissChecklist: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Podaj co najmniej jedno pole',
  });
export type UpdateOnboardingInput = z.infer<typeof updateOnboardingInputSchema>;

// ---------------------------------------------------------------------------
// Digest e-mail (19.08)
//
// Digest jest domyślnie WŁĄCZONY (to zbiorczy mail o własnych powiadomieniach),
// ale wypis musi działać jednym kliknięciem z maila — bez logowania. Stąd token:
// trwały, per użytkownik, dowód posiadania skrzynki.
// ---------------------------------------------------------------------------

export const digestOptOutInputSchema = z.object({ optedOut: z.boolean() });
export type DigestOptOutInput = z.infer<typeof digestOptOutInputSchema>;

export const digestUnsubscribeInputSchema = z.object({
  token: z.string().trim().min(16).max(64),
});
export type DigestUnsubscribeInput = z.infer<typeof digestUnsubscribeInputSchema>;

// ---------------------------------------------------------------------------
// Administracja użytkownikami (19.08)
//
// Do tej pory nadanie roli MODERATOR wymagało ręcznego SQL-a na produkcji —
// dokładnie ta klasa „funkcji bez wejścia w UI", którą tępi strażnik tras.
// ADMIN celowo POZA zasięgiem tych tras: rolą ADMIN zarządza się poza aplikacją,
// żeby przejęte konto admina nie mogło mianować kolejnych adminów.
// ---------------------------------------------------------------------------

export const adminSetRoleInputSchema = z.object({
  role: z.enum(['USER', 'MODERATOR']),
});
export type AdminSetRoleInput = z.infer<typeof adminSetRoleInputSchema>;

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  handle: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  createdAt: string;
  emailVerifiedAt: string | null;
}

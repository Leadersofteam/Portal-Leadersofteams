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

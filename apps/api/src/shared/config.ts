import { z } from 'zod';

// Aplikacja nie wstaje z błędną konfiguracją (ADR-008).
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_COOKIE_NAME: z.string().default('lot_sid'),
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // Publiczny adres bazowy (linki w e-mailach weryfikacji/resetu).
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  // E-mail (D4) — WŁASNA SKRZYNKA przez SMTP, ta sama, której używa App
  // (smtp.hostinger.com, kontakt@leadersofteams.com). Zero dostawcy po API,
  // zero nowego kosztu: skrzynka jest opłacona w ramach hostingu domeny.
  // Brak kompletu danych = tryb no-op (log zamiast wysyłki), bezpieczny domyślny stan.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  MAIL_FROM: z.string().email().default('no-reply@leadersofteams.pl'),
  MAIL_FROM_NAME: z.string().default('Leaders of Teams'),
  // Bramka człowieka (R-03/R-13) — WŁASNA, bez zewnętrznego dostawcy.
  // Domyślnie WŁĄCZONA, bo nic nie kosztuje i nie wymaga niczyich kluczy —
  // odwrotnie niż wykluczony Turnstile, który bez kluczy stał wyłączony.
  // 'off' wyłącza (testy integracyjne innych modułów rejestrują konta wprost).
  HUMANCHECK: z.enum(['on', 'off']).optional(),
  // Moduł files: katalog na przetworzone warianty (volume w compose).
  UPLOADS_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
});

export type AppConfig = z.infer<typeof envSchema> & {
  isProduction: boolean;
  cookieSecure: boolean;
  // Wysyłka e-mail włączona tylko przy komplecie danych SMTP (inaczej no-op).
  mailEnabled: boolean;
  // Bramka anty-bot przy rejestracji (własna, proof-of-work).
  humancheckEnabled: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Błędna konfiguracja środowiska: ${issues}`);
  }
  const isProduction = parsed.data.NODE_ENV === 'production';
  return {
    ...parsed.data,
    isProduction,
    cookieSecure: isProduction,
    // Wysyłka działa wyłącznie przy KOMPLETNYM zestawie SMTP. Sam SMTP_HOST bez
    // użytkownika/hasła to najczęstsza połowiczna konfiguracja, która kończy się
    // cichym „connection refused" zamiast jawnego no-opu.
    mailEnabled: Boolean(parsed.data.SMTP_HOST && parsed.data.SMTP_USER && parsed.data.SMTP_PASS),
    // Domyślnie ON wszędzie poza testami: własna bramka nie wymaga sekretów,
    // więc nie ma powodu, żeby produkcja chodziła bez niej. Testy integracyjne
    // innych modułów rejestrują konta wprost i nie mają jak liczyć PoW.
    humancheckEnabled:
      parsed.data.HUMANCHECK === 'on' ||
      (parsed.data.HUMANCHECK !== 'off' && parsed.data.NODE_ENV !== 'test'),
  };
}

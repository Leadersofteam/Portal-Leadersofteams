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
  // E-mail (D4) — opcjonalny sekret. Brak klucza = tryb no-op (0 zł, ADR-009),
  // wysyłka wyłączona; scaffolding gotowy do włączenia po podaniu klucza Brevo.
  BREVO_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().email().default('no-reply@leadersofteams.pl'),
  MAIL_FROM_NAME: z.string().default('Leaders of Teams'),
  // Anty-bot Turnstile (D7, R-03/R-13) — opcjonalny sekret. Brak = ochrona OFF
  // (0 zł, bezpieczny domyślny stan otwarty); włączenie przy launchu przez właściciela.
  TURNSTILE_SECRET_KEY: z.string().optional(),
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
  // Wysyłka e-mail włączona tylko gdy podano klucz (inaczej no-op).
  mailEnabled: boolean;
  // Ochrona Turnstile włączona tylko gdy podano sekret (inaczej OFF).
  turnstileEnabled: boolean;
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
    mailEnabled: Boolean(parsed.data.BREVO_API_KEY),
    turnstileEnabled: Boolean(parsed.data.TURNSTILE_SECRET_KEY),
  };
}

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
});

export type AppConfig = z.infer<typeof envSchema> & {
  isProduction: boolean;
  cookieSecure: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Błędna konfiguracja środowiska: ${issues}`);
  }
  const isProduction = parsed.data.NODE_ENV === 'production';
  return { ...parsed.data, isProduction, cookieSecure: isProduction };
}

import type { ZodTypeAny, z } from 'zod';

export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const err = new Error('Nieprawidłowe dane wejściowe') as Error & {
      statusCode: number;
      code: string;
      details: unknown;
    };
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    err.details = parsed.error.flatten();
    throw err;
  }
  return parsed.data as z.output<S>;
}

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive(),
  FRONTEND_URL: z.string().url(),
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith('mysql://'), {
      message: 'DATABASE_URL must be a valid MySQL connection URL',
    }),
});

export function validate(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
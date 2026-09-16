import { z } from 'zod';
import { defaultDatabaseUrl } from './paths';

/**
 * Environment is parsed once, at boot, and fails loudly. Nothing else in the
 * app reads process.env. Use `node --env-file=.env` if you want a file; no
 * dotenv dependency is needed.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  DATABASE_URL: z.string().min(1).default(defaultDatabaseUrl),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment:\n', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;

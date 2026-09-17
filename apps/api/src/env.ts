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

  /* Which Hugging Face dataset the ingest reads. Changing these three is the
     only thing needed to point this app at a different dataset — assuming the
     new one has the same columns, which is what `schema.ts` encodes. */
  HF_DATASET: z.string().min(1).default('MongoDB/embedded_movies'),
  HF_DATASET_CONFIG: z.string().min(1).default('default'),
  HF_DATASET_SPLIT: z.string().min(1).default('train'),

  /* Ingest the dataset automatically when the table is empty, so a fresh
     clone reaches a populated app with `npm run dev` alone. */
  INGEST_ON_BOOT: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  /* Stop after roughly this many rows. Handy for a fast first run; unset
     means the whole dataset. */
  INGEST_LIMIT: z.coerce.number().int().positive().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment:\n', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;

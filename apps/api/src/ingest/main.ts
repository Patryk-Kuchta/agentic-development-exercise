import { z } from 'zod';
import { applyMigrations, createDb } from '../db';
import { env } from '../env';
import { countMovies, countMoviesWithEmbedding } from '../movies';
import { requireSupportedNodeVersion } from '../node-version';
import { migrationsDir } from '../paths';
import { ingestMovies } from './ingest';

requireSupportedNodeVersion();

/**
 * `npm run ingest` — fill the database from the Hugging Face dataset.
 *
 * Safe to run as often as you like: ingest upserts on the imdb id, so a
 * second run refreshes the rows it already has rather than duplicating them.
 */

const optionsSchema = z.strictObject({
  limit: z.coerce.number().int().positive().optional(),
});

/**
 * argv is untrusted input like any other, so it goes through Zod. Anything
 * that is not `--name=value` is a mistake worth stopping for — silently
 * ignoring a misspelt flag is how you ingest the whole dataset by accident.
 */
function parseOptions(argv: readonly string[]): z.infer<typeof optionsSchema> {
  const raw: Record<string, string> = {};

  for (const argument of argv) {
    const separator = argument.indexOf('=');

    if (!argument.startsWith('--') || separator === -1) {
      throw new Error(`Expected an option of the form --limit=100, found "${argument}"`);
    }

    raw[argument.slice(2, separator)] = argument.slice(separator + 1);
  }

  const parsed = optionsSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(`Could not read the command line:\n${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}

/** A misspelt flag deserves a sentence, not a stack trace. */
function readOptions(): z.infer<typeof optionsSchema> {
  try {
    return parseOptions(process.argv.slice(2));
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('Usage: npm run ingest -- --limit=100');
    process.exit(1);
  }
}

const limit = readOptions().limit ?? env.INGEST_LIMIT;

const db = createDb(env.DATABASE_URL);
applyMigrations(db, migrationsDir);

const moviesBefore = countMovies(db);

console.warn(
  `Ingesting ${env.HF_DATASET} (${env.HF_DATASET_CONFIG}/${env.HF_DATASET_SPLIT})` +
    (limit === undefined ? '' : `, stopping after ${String(limit)} rows`),
);

try {
  const summary = await ingestMovies(db, {
    limit,
    onProgress: (fetched, total) => {
      console.warn(`  ${String(fetched)}/${String(total)} rows`);
    },
  });

  const moviesAfter = countMovies(db);
  const merged = summary.upserted - (moviesAfter - moviesBefore);

  console.warn(
    [
      '',
      `Fetched         ${String(summary.fetched)} of ${String(summary.totalAvailable)} dataset rows`,
      `Written         ${String(summary.upserted)}`,
      `Skipped         ${String(summary.skipped)}`,
      `With embedding  ${String(summary.withEmbedding)}`,
      `Movies stored   ${String(moviesAfter)} (${String(countMoviesWithEmbedding(db))} with a plot vector)`,
      '',
      `${String(merged)} written rows landed on a movie that was already there — a repeated imdb`,
      'id in the dataset, or a movie an earlier run had stored. The imdb id is the',
      'natural key and ingest upserts on it, so running this again changes nothing.',
    ].join('\n'),
  );
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('Ingest failed. Nothing was left half-written: each page is its own transaction.');
  process.exitCode = 1;
}

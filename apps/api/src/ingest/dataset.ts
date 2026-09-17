import { z } from 'zod';
import { env } from '../env';

/**
 * The boundary between this app and the Hugging Face datasets server.
 *
 * Everything the server sends is untrusted input, so it is parsed with Zod
 * here and nowhere else. Past this file the rest of the ingest works with
 * types, not with `unknown`.
 */

/** The rows API caps `length`; asking for more is an error, not a bigger page. */
export const maxPageSize = 100;

/**
 * Numbers in this dataset are occasionally the empty string — the source's
 * way of saying "unknown". Unknown becomes `null`; it never becomes a zero,
 * because a movie with no IMDb rating is not a movie rated 0.
 */
const looseNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (value === undefined || value === null) {
      return null;
    }
    const parsed = Number(value.trim());
    return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
  });

/** Nullable text columns: 27 rows have no plot, 308 no rating, 89 no poster. */
const looseText = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

/**
 * `cast`, `directors`, `writers` and `languages` are null on a handful of
 * rows. The columns they feed are `notNull`, and "we know of nobody" is
 * honestly an empty list, so a missing array becomes `[]`.
 */
const looseStringArray = z
  .array(z.string())
  .nullish()
  .transform((value) => value ?? []);

/** 28 of the 1500 rows ship without a vector. Those movies still belong in the table. */
const looseEmbedding = z
  .array(z.number())
  .nullish()
  .transform((value) => value ?? null);

/**
 * One row of `MongoDB/embedded_movies`, in the dataset's own snake_case
 * spelling. Renaming happens in `toMovieDraft`, not here — this schema
 * describes what the server sends, not what we store.
 *
 * `imdb.id` is the only field with no tolerant fallback: it is the natural
 * key we upsert on, so a row without a usable one cannot be stored at all
 * and is reported as skipped.
 */
export const datasetRowSchema = z.object({
  title: z.string(),
  type: z.string(),
  plot: looseText,
  fullplot: looseText,
  poster: looseText,
  rated: looseText,
  runtime: looseNumber,
  metacritic: looseNumber,
  num_mflix_comments: looseNumber,
  genres: looseStringArray,
  cast: looseStringArray,
  directors: looseStringArray,
  writers: looseStringArray,
  countries: looseStringArray,
  languages: looseStringArray,
  imdb: z.object({
    id: z.number().int(),
    rating: looseNumber,
    votes: looseNumber,
  }),
  awards: z.object({
    wins: looseNumber,
    nominations: looseNumber,
    text: looseText,
  }),
  plot_embedding: looseEmbedding,
});

export type DatasetRow = z.infer<typeof datasetRowSchema>;

/**
 * The envelope is parsed strictly, but each `row` is left as `unknown` and
 * parsed separately by the ingest. One malformed row then costs us that row,
 * not the whole page.
 */
const datasetPageSchema = z.object({
  num_rows_total: z.number().int().nonnegative(),
  rows: z.array(z.object({ row: z.unknown() })),
});

export interface DatasetPage {
  /** How many rows the dataset holds in total, as the server reports it. */
  readonly totalRows: number;
  /** The page's rows, still unparsed, in the order the server sent them. */
  readonly rows: readonly unknown[];
}

function buildRowsUrl(offset: number, length: number): string {
  const url = new URL('https://datasets-server.huggingface.co/rows');
  url.searchParams.set('dataset', env.HF_DATASET);
  url.searchParams.set('config', env.HF_DATASET_CONFIG);
  url.searchParams.set('split', env.HF_DATASET_SPLIT);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('length', String(Math.min(length, maxPageSize)));
  return url.toString();
}

/** A full ingest is fifteen requests, and the server really does return the odd 502. */
const maxAttempts = 3;
const retryBaseDelayMs = 250;

/** 5xx and 429 are the server having a moment. A 4xx means we asked wrongly. */
function isWorthRetrying(status: number): boolean {
  return status === 429 || status >= 500;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function parsePage(url: string, body: unknown): DatasetPage {
  const parsed = datasetPageSchema.safeParse(body);

  if (!parsed.success) {
    throw new Error(
      `Expected a { num_rows_total, rows } payload from ${url}, got:\n${z.prettifyError(parsed.error)}`,
    );
  }

  return {
    totalRows: parsed.data.num_rows_total,
    rows: parsed.data.rows.map((entry) => entry.row),
  };
}

/**
 * Reads one page over plain `fetch`. The dataset is served as JSON rows, so
 * there is no parquet reader and no extra dependency — see AGENTS.md rule 2.
 *
 * A transient failure is retried a couple of times because abandoning a
 * 1500-row ingest over one bad gateway helps nobody. Everything else still
 * throws immediately, naming the status and the URL.
 */
export async function fetchDatasetPage(offset: number, length: number): Promise<DatasetPage> {
  const url = buildRowsUrl(offset, length);

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url);

    if (response.ok) {
      return parsePage(url, await response.json());
    }

    if (attempt >= maxAttempts || !isWorthRetrying(response.status)) {
      throw new Error(
        `Expected a 2xx response from the Hugging Face datasets server, got ${String(response.status)} ${response.statusText} for ${url} (after ${String(attempt)} attempts)`,
      );
    }

    await wait(retryBaseDelayMs * attempt);
  }
}

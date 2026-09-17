import { getColumns, sql } from 'drizzle-orm';
import { movies, type MovieDraft } from '@app/contract';
import { z } from 'zod';
import type { Db } from '../db';
import { datasetRowSchema, fetchDatasetPage, maxPageSize, type DatasetPage } from './dataset';
import { toMovieDraft } from './to-movie-draft';

export interface IngestSummary {
  /** Rows the dataset server handed us. */
  fetched: number;
  /** Rows written — inserted, or updated because their imdb id was already here. */
  upserted: number;
  /** Rows we could not map, each one logged with the reason. */
  skipped: number;
  /** How many of the written rows carried a plot vector. */
  withEmbedding: number;
  /** The dataset's own row count, as reported by the server. */
  totalAvailable: number;
}

export type FetchPage = (offset: number, length: number) => Promise<DatasetPage>;

export interface IngestOptions {
  /** Stop after roughly this many fetched rows. Unset means the whole dataset. */
  limit?: number | undefined;
  /** Rows per request. Silently capped at the server's limit of 100. */
  pageSize?: number | undefined;
  onProgress?: ((fetched: number, total: number) => void) | undefined;
  /** Injected by tests. Defaults to the real HTTP call. */
  fetchPage?: FetchPage | undefined;
}

/**
 * One INSERT per row would be 1500 round trips. SQLite takes many rows in a
 * single statement, and a page's worth of them is well inside its parameter
 * limit.
 */
const insertBatchSize = 100;

/**
 * In a SQLite upsert, `excluded` names the row that lost the race — the one
 * we were trying to insert. Pointing each column at `excluded` is what lets a
 * single statement carry a hundred rows and still give every conflicting row
 * its own new values; a plain value there would write it to all of them.
 *
 * The object is built from the table's own columns so that a column added to
 * `schema.ts` is refreshed too, without anyone remembering to come here.
 * `id` is the surrogate key of the row that already exists and `imdbId` is
 * what we matched on, so neither is touched.
 */
const refreshedColumns = Object.fromEntries(
  Object.entries(getColumns(movies))
    .filter(([property]) => property !== 'id' && property !== 'imdbId')
    .map(([property, column]) => [property, sql.raw(`excluded.${column.name}`)]),
);

function upsertMovies(db: Db, drafts: readonly MovieDraft[]): void {
  if (drafts.length === 0) {
    return;
  }

  /* One transaction for the whole page: SQLite commits per statement
     otherwise, and each commit is an fsync. */
  db.transaction((tx) => {
    for (let start = 0; start < drafts.length; start += insertBatchSize) {
      const batch = drafts.slice(start, start + insertBatchSize);
      tx.insert(movies)
        .values(batch)
        .onConflictDoUpdate({ target: movies.imdbId, set: refreshedColumns })
        .run();
    }
  });
}

/**
 * Fills the `movies` table from the Hugging Face dataset, a page at a time.
 *
 * Writing is an upsert on `imdb_id`, which buys two things at once: the
 * dataset repeats 45 of its 1500 rows and they collapse onto one movie each,
 * and running the whole ingest again is a no-op rather than a pile of
 * duplicates. A clean full run lands 1455 movies.
 */
export async function ingestMovies(db: Db, options: IngestOptions = {}): Promise<IngestSummary> {
  const fetchPage = options.fetchPage ?? fetchDatasetPage;
  const pageSize = Math.min(options.pageSize ?? maxPageSize, maxPageSize);
  const limit = options.limit;

  if (pageSize < 1) {
    throw new Error(`Expected a page size of at least 1, got ${String(pageSize)}`);
  }

  const summary: IngestSummary = {
    fetched: 0,
    upserted: 0,
    skipped: 0,
    withEmbedding: 0,
    totalAvailable: 0,
  };

  let offset = 0;

  for (;;) {
    const wanted = limit === undefined ? pageSize : Math.min(pageSize, limit - summary.fetched);
    if (wanted < 1) {
      break;
    }

    const page = await fetchPage(offset, wanted);
    summary.totalAvailable = page.totalRows;

    if (page.rows.length === 0) {
      break;
    }

    const drafts: MovieDraft[] = [];

    for (const [position, raw] of page.rows.entries()) {
      const parsed = datasetRowSchema.safeParse(raw);

      if (!parsed.success) {
        /* Loudly, but not fatally: one unreadable row should not cost us the
           other 1499. The count is reported back in the summary. */
        summary.skipped += 1;
        console.warn(
          `Skipping dataset row ${String(offset + position)}:\n${z.prettifyError(parsed.error)}`,
        );
        continue;
      }

      drafts.push(toMovieDraft(parsed.data));
    }

    upsertMovies(db, drafts);

    summary.fetched += page.rows.length;
    summary.upserted += drafts.length;
    summary.withEmbedding += drafts.filter(
      (draft) => draft.plotEmbedding !== null && draft.plotEmbedding !== undefined,
    ).length;
    offset += page.rows.length;

    options.onProgress?.(summary.fetched, summary.totalAvailable);

    /* A short page means the server has nothing more to give. */
    if (page.rows.length < wanted) {
      break;
    }
  }

  return summary;
}

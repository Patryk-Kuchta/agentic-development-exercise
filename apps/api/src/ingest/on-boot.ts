import type { Db } from '../db';
import { env } from '../env';
import { countMovies } from '../movies';
import { ingestMovies } from './ingest';

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Populates an empty database the first time the server starts, so that a
 * fresh clone reaches a working app with `npm run dev` and nothing else.
 *
 * Call this *after* `listen`. The ingest downloads about 1500 rows and takes
 * the better part of a minute, and the server should be answering
 * `/api/health` throughout.
 */
export function ingestOnBoot(db: Db): void {
  if (!env.INGEST_ON_BOOT) {
    return;
  }

  if (countMovies(db) > 0) {
    return;
  }

  console.warn('No movies in the database yet — ingesting from Hugging Face in the background.');

  /*
   * Deliberately not awaited, and deliberately not fatal.
   *
   * This runs on every `npm run dev`, and a flaky network or a datasets
   * server having a bad afternoon must not turn into an API that refuses to
   * start. The failure is loud and names the remedy; the app keeps serving,
   * and the web landing page renders its "no movies yet" state.
   *
   * `void` plus a terminal `.catch` is what keeps this off the floating
   * promise rule: the chain is handled, it simply is not waited for.
   */
  void ingestMovies(db, {
    limit: env.INGEST_LIMIT,
    onProgress: (fetched, total) => {
      console.warn(`Ingest: ${String(fetched)}/${String(total)} rows`);
    },
  })
    .then((summary) => {
      console.warn(
        `Ingest finished: ${String(summary.upserted)} rows written, ${String(countMovies(db))} movies in the database.`,
      );
    })
    .catch((error: unknown) => {
      console.error(`Automatic ingest failed: ${describe(error)}`);
      console.error('The API is still serving. Run `npm run ingest` to try again.');
    });
}

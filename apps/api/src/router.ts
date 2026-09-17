import { implement } from '@orpc/server';
import { contract } from '@app/contract';
import type { Db } from './db';
import { countMovies, countMoviesWithEmbedding } from './movies';

const os = implement(contract);

/**
 * A process that is up but cannot read its own SQLite file is not healthy, so
 * the probe runs a real query against a real table — which also proves the
 * migrations were applied.
 *
 * This is the one place the project's "fail loudly" rule inverts: reporting
 * `database: false` is exactly the loud failure this endpoint exists for, and
 * a health check that 500s tells a monitor less than one that answers.
 */
function isDatabaseReachable(db: Db): boolean {
  try {
    countMovies(db);
    return true;
  } catch {
    return false;
  }
}

/**
 * The implementation of the contract. Argument and return types are checked
 * against it, and its Zod schemas validate inputs before a handler runs, so
 * nothing here re-declares a shape. Handlers stay thin: the queries live in
 * `movies.ts`.
 */
export function createRouter(db: Db) {
  return os.router({
    health: os.health.handler(() => ({
      /* `as const` keeps the literal the contract's `z.literal('ok')` wants;
         without it the inferred return type widens to `string`. */
      status: 'ok' as const,
      database: isDatabaseReachable(db),
    })),

    stats: os.stats.handler(() => {
      const movieCount = countMovies(db);

      return {
        movieCount,
        moviesWithEmbedding: countMoviesWithEmbedding(db),
        isIngested: movieCount > 0,
      };
    }),
  });
}

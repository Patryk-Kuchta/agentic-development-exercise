import { count, isNotNull } from 'drizzle-orm';
import { movies } from '@app/contract';
import type { Db } from './db';

/**
 * Data access for the `movies` table. Everything here goes through Drizzle's
 * query builder rather than a SQL string, so a column rename in `schema.ts`
 * becomes a type error here instead of a runtime one.
 */

/**
 * `COUNT(*)` always produces exactly one row, but `noUncheckedIndexedAccess`
 * does not know that, so the impossible case gets a message rather than a `!`.
 */
function firstCount(rows: readonly { value: number }[]): number {
  const [row] = rows;
  if (row === undefined) {
    throw new Error(`Expected COUNT(*) to return one row, got ${String(rows.length)}`);
  }
  return row.value;
}

/**
 * Counted in SQLite. Reading the rows and taking `.length` would pull every
 * movie — including its 6 KiB vector — across the driver to learn one number.
 */
export function countMovies(db: Db): number {
  return firstCount(db.select({ value: count() }).from(movies).all());
}

/** How much of the table exercise 3 can actually use: 28 dataset rows ship without a vector. */
export function countMoviesWithEmbedding(db: Db): number {
  return firstCount(
    db.select({ value: count() }).from(movies).where(isNotNull(movies.plotEmbedding)).all(),
  );
}

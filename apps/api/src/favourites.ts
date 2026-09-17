import { and, eq, inArray } from 'drizzle-orm';
import { favourites } from '@app/contract';
import type { Db } from './db';

/**
 * The join table between a user and the films they liked. Nothing here knows
 * about HTTP; the router turns these results into responses.
 */

/**
 * Adding a favourite twice is a no-op rather than a constraint violation.
 *
 * The composite primary key means SQLite would reject the second insert, and a
 * double-clicked heart is not an error anyone should have to see — so the
 * database keeps the guarantee and this turns it into "already done".
 */
export function addFavourite(db: Db, userId: number, movieId: number): void {
  db.insert(favourites).values({ userId, movieId }).onConflictDoNothing().run();
}

/** Removing one that was never there leaves the caller where they asked to be. */
export function removeFavourite(db: Db, userId: number, movieId: number): void {
  db.delete(favourites)
    .where(and(eq(favourites.userId, userId), eq(favourites.movieId, movieId)))
    .run();
}

export function isFavourite(db: Db, userId: number, movieId: number): boolean {
  return (
    db
      .select({ movieId: favourites.movieId })
      .from(favourites)
      .where(and(eq(favourites.userId, userId), eq(favourites.movieId, movieId)))
      .get() !== undefined
  );
}

/**
 * Which of these films the user has favourited, as one query.
 *
 * A page of 24 cards each asking "is this one mine?" is 24 round trips to
 * answer one question. Passing the whole page's ids in and getting a set back
 * is one.
 */
export function findFavouritedAmong(
  db: Db,
  userId: number,
  movieIds: readonly number[],
): Set<number> {
  /* `IN ()` is not valid SQL, and an empty page has nothing to ask about. */
  if (movieIds.length === 0) {
    return new Set();
  }

  const rows = db
    .select({ movieId: favourites.movieId })
    .from(favourites)
    .where(and(eq(favourites.userId, userId), inArray(favourites.movieId, movieIds)))
    .all();

  return new Set(rows.map((row) => row.movieId));
}

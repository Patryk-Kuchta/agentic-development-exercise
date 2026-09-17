import { count, isNotNull } from 'drizzle-orm';
import { movies } from '@app/contract';
import type { Db } from './db';

/**
 * Data access for the `movies` table. Everything here goes through Drizzle's
 * query builder rather than a SQL string, so a column rename in `schema.ts`
 * becomes a type error here instead of a runtime one.
 */

/**
 * Who is asking, or `undefined` for a signed-out caller.
 *
 * Reads take it because some facts about a film — whether *you* have favourited
 * it — are facts about the pair, not about the film. Nothing on `main` uses it
 * yet; exercise 2 is what gives it meaning.
 */
export type Viewer = number | undefined;

/**
 * Every column except the vector, named one by one because Drizzle has no
 * "all columns but this one" helper. `plot_embedding` is 6 KiB a row and is
 * never sent to a browser, so it is not read in the first place.
 *
 * This list cannot silently drift: anything annotated as returning `Movie` —
 * a type derived from the table — stops compiling if a column added to
 * `schema.ts` is left out here.
 */
export const movieColumns = {
  id: movies.id,
  imdbId: movies.imdbId,
  title: movies.title,
  type: movies.type,
  plot: movies.plot,
  fullplot: movies.fullplot,
  poster: movies.poster,
  rated: movies.rated,
  runtime: movies.runtime,
  genres: movies.genres,
  castMembers: movies.castMembers,
  directors: movies.directors,
  writers: movies.writers,
  countries: movies.countries,
  languages: movies.languages,
  imdbRating: movies.imdbRating,
  imdbVotes: movies.imdbVotes,
  metacritic: movies.metacritic,
  awardsWins: movies.awardsWins,
  awardsNominations: movies.awardsNominations,
  awardsText: movies.awardsText,
  numMflixComments: movies.numMflixComments,
  ingestedAt: movies.ingestedAt,
};

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

import { and, asc, count, desc, eq, isNotNull, like, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { movies, type Movie, type MovieSummary, type movieSortSchema } from '@app/contract';
import type { Db } from './db';

/**
 * Data access for the `movies` table. Everything here goes through Drizzle's
 * query builder rather than a SQL string, so a column rename in `schema.ts`
 * becomes a type error here instead of a runtime one.
 */

/** The contract owns the set of sort orders; this is the same union, not a second one. */
type MovieSort = z.infer<typeof movieSortSchema>;

/** One page of the movie list, already parsed and defaulted by the contract. */
export interface MovieListQuery {
  page: number;
  pageSize: number;
  search?: string | undefined;
  genre?: string | undefined;
  sort: MovieSort;
}

export interface MovieListPage {
  items: MovieSummary[];
  /** Rows matching the filters, not rows returned — a pager needs both. */
  total: number;
}

/**
 * What a card in the list renders, matching `movieSummarySchema`'s pick. The
 * list ships 24 rows at a time, so `fullplot`, `writers` and the rest stay in
 * the database until someone opens a film.
 */
const summaryColumns = {
  id: movies.id,
  title: movies.title,
  poster: movies.poster,
  genres: movies.genres,
  imdbRating: movies.imdbRating,
  runtime: movies.runtime,
  type: movies.type,
  rated: movies.rated,
  plot: movies.plot,
};

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
 * `genres` is a JSON array living in one TEXT column, and Drizzle's query
 * builder has no "this JSON array contains X" operator for SQLite. `json_each`
 * expands the array into one row per genre so a plain `=` can do the work.
 * The genre arrives as a bound parameter — Drizzle never splices it into the
 * SQL text — so this stays safe with user input.
 */
function hasGenre(genre: string): SQL {
  return sql`exists (select 1 from json_each(${movies.genres}) where json_each.value = ${genre})`;
}

/** The filters, built once and reused by both the page query and its count. */
function matching(query: MovieListQuery): SQL | undefined {
  const conditions: SQL[] = [];

  if (query.search !== undefined) {
    /* SQLite's LIKE is already case-insensitive for ASCII, which is the whole
       requirement. Drizzle binds the pattern as a parameter. */
    conditions.push(like(movies.title, `%${query.search}%`));
  }

  if (query.genre !== undefined) {
    conditions.push(hasGenre(query.genre));
  }

  /* `and()` of nothing is `undefined`, which Drizzle reads as "no WHERE". */
  return and(...conditions);
}

/**
 * `movies.id` is the tiebreak on every order. Without it SQLite may return
 * equally-rated rows in any order it likes, and page 2 silently repeats rows
 * from page 1 — the classic unstable-pagination bug.
 */
function orderFor(sort: MovieSort): SQL[] {
  switch (sort) {
    case 'rating':
      /* SQLite sorts NULL below every value, so DESC puts the unrated last on
         its own: a film nobody has voted on must not head the chart. */
      return [desc(movies.imdbRating), asc(movies.id)];
    case 'title':
      return [asc(movies.title), asc(movies.id)];
  }
}

export function listMovies(db: Db, query: MovieListQuery): MovieListPage {
  const where = matching(query);

  /* LIMIT/OFFSET in SQL, never a full table read plus `.slice()`: the database
     is the only thing that can skip rows without materialising them. */
  const items = db
    .select(summaryColumns)
    .from(movies)
    .where(where)
    .orderBy(...orderFor(query.sort))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize)
    .all();

  /* A second query, because the total has to ignore the LIMIT that the first
     one applies. SQLite counts matching rows without reading their columns. */
  const total = firstCount(db.select({ value: count() }).from(movies).where(where).all());

  return { items, total };
}

/** `undefined` rather than a throw: "no such id" is the router's 404 to declare, not ours. */
export function findMovie(db: Db, id: number): Movie | undefined {
  return db.select(movieColumns).from(movies).where(eq(movies.id, id)).get();
}

/** `db.all` hands back `unknown`; the project rule is to parse a boundary, not assert it. */
const genreRowsSchema = z.array(z.object({ genre: z.string() }));

/**
 * The genre dropdown's options. This is the one query the builder cannot
 * express: `json_each` is a table-valued function that joins each movie
 * against its own JSON array, and Drizzle has no `from(json_each(...))`.
 * Nothing in the statement comes from a caller.
 */
export function listGenres(db: Db): string[] {
  const rows = db.all(sql`
    select distinct json_each.value as genre
    from ${movies}, json_each(${movies.genres})
    order by genre
  `);

  return genreRowsSchema.parse(rows).map((row) => row.genre);
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

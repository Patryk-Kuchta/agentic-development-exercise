import { isNotNull } from 'drizzle-orm';
import { movies } from '@app/contract';
import type { Db } from './db';
import { decodeEmbedding } from './embeddings';

/**
 * Similarity over the plot embeddings.
 *
 * Everything here is arithmetic on `Float32Array`s except `loadEmbeddings`,
 * which is the only function that touches the database. That split is what
 * lets the maths be tested without a server — and it keeps the vectors in this
 * process, which design constraint 2 of exercise 3 requires.
 */

/** One movie's plot vector, already decoded out of its BLOB. */
export interface MovieEmbedding {
  id: number;
  embedding: Float32Array;
}

/**
 * A suggestion. The score travels with it so the UI can show its working —
 * a recommendation you cannot interrogate is indistinguishable from a guess.
 */
export interface ScoredMovie {
  id: number;
  score: number;
}

function magnitudeOf(vector: Float32Array): number {
  let sumOfSquares = 0;

  for (const value of vector) {
    sumOfSquares += value * value;
  }

  return Math.sqrt(sumOfSquares);
}

/**
 * How closely two plots point the same way: 1 identical, 0 unrelated, negative
 * opposed.
 *
 * The stored vectors are not assumed to be unit length, so this divides by both
 * magnitudes rather than taking the dot product alone.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `Expected two vectors of the same length, found ${String(a.length)} and ${String(b.length)}`,
    );
  }

  let dot = 0;

  for (const [index, value] of a.entries()) {
    /* `noUncheckedIndexedAccess` types the read as possibly undefined. The
       length check above is what makes the fallback unreachable. */
    dot += value * (b[index] ?? 0);
  }

  const scale = magnitudeOf(a) * magnitudeOf(b);

  /* A vector of all zeros has no direction, so it resembles nothing. Dividing
     would give NaN, and NaN compares false against everything — it would sort
     to wherever the comparison happened to leave it and quietly corrupt the
     ranking rather than failing. */
  return scale === 0 ? 0 : dot / scale;
}

/**
 * The `limit` closest candidates, best first.
 *
 * `excludedIds` is what stops a film being its own "more like this", and what
 * stops a suggestions page recommending what the user has already favourited.
 *
 * Scoring all 1455 rows and sorting is deliberate. A bounded insert would do
 * fewer comparisons, but the whole scan is milliseconds and the sort is the
 * version a reader can check by eye.
 */
export function findMostSimilar(
  query: Float32Array,
  candidates: readonly MovieEmbedding[],
  excludedIds: ReadonlySet<number>,
  limit: number,
): ScoredMovie[] {
  return candidates
    .filter((candidate) => !excludedIds.has(candidate.id))
    .map((candidate) => ({
      id: candidate.id,
      score: cosineSimilarity(query, candidate.embedding),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

/**
 * One vector standing for everything a user has favourited.
 *
 * Each favourite is **normalised before it is added**, so that a film with a
 * long vector does not shout down the rest, and the total is **normalised
 * again on the way out**, so the result is a direction and nothing else.
 * Dividing by the count is left out on purpose: the sum of the unit directions
 * and their average point the same way, and the second normalise removes the
 * difference.
 *
 * `undefined` rather than a zero vector when there is nothing to average, so
 * the caller can say "favourite something first" instead of scanning with a
 * vector that means nothing.
 */
export function buildTasteVector(favourites: readonly Float32Array[]): Float32Array | undefined {
  const [first] = favourites;

  if (first === undefined) {
    return undefined;
  }

  const total = new Float32Array(first.length);

  for (const favourite of favourites) {
    const favouriteMagnitude = magnitudeOf(favourite);

    /* A zero vector points nowhere, so it gets no vote rather than an NaN one. */
    if (favouriteMagnitude === 0) {
      continue;
    }

    for (const [index, value] of favourite.entries()) {
      total[index] = (total[index] ?? 0) + value / favouriteMagnitude;
    }
  }

  const totalMagnitude = magnitudeOf(total);

  return totalMagnitude === 0 ? undefined : total.map((component) => component / totalMagnitude);
}

/**
 * Every stored vector, decoded once.
 *
 * Once is the point. A single suggestion request compares the query against
 * every row, so decoding inside the comparison decodes the whole table once per
 * movie in it. Decode here, scan the result. Nothing invalidates it but an
 * ingest, so a caller may safely hold on to it for the life of a request — or
 * longer, if it is prepared to drop it when the ingest runs.
 *
 * The 28 rows the dataset ships without a vector are filtered out in SQL. The
 * column stays nullable in the type either way, and a blob is narrowed with
 * `instanceof` rather than `as`, which the repo bans.
 */
export function loadEmbeddings(db: Db): MovieEmbedding[] {
  const rows = db
    .select({ id: movies.id, plotEmbedding: movies.plotEmbedding })
    .from(movies)
    .where(isNotNull(movies.plotEmbedding))
    .all();

  const loaded: MovieEmbedding[] = [];

  for (const row of rows) {
    if (row.plotEmbedding instanceof Uint8Array) {
      loaded.push({ id: row.id, embedding: decodeEmbedding(row.plotEmbedding) });
    }
  }

  return loaded;
}

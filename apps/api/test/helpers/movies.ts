import { movies, type MovieDraft } from '@app/contract';
import type { Db } from '../../src/db';

/**
 * A minimally valid row, with the fields a test cares about overridden. Adding
 * a required column breaks this one function instead of every test that
 * happens to insert a movie.
 */
export function movieDraft(overrides: Partial<MovieDraft>): MovieDraft {
  return {
    imdbId: 1,
    title: 'A Movie',
    type: 'movie',
    genres: [],
    castMembers: [],
    directors: [],
    writers: [],
    countries: [],
    languages: [],
    ...overrides,
  };
}

/** Returns the generated id, which is what a test needs to call `/movies/{id}`. */
export function insertMovie(db: Db, overrides: Partial<MovieDraft>): number {
  return db.insert(movies).values(movieDraft(overrides)).returning({ id: movies.id }).get().id;
}

/**
 * The counts only care that the blob is there, so the contents are arbitrary.
 * Encoding a genuine 1536-float vector is `embeddings.ts`'s job, and exercise
 * 3's problem.
 */
export function someEmbedding(): Buffer {
  return Buffer.from(new Uint8Array(Float32Array.from([0.1, 0.2, 0.3]).buffer));
}

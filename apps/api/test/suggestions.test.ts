import { beforeEach, describe, expect, it } from 'vitest';
import { applyMigrations, createDb, type Db } from '../src/db';
import { encodeEmbedding } from '../src/embeddings';
import { migrationsDir } from '../src/paths';
import {
  buildTasteVector,
  cosineSimilarity,
  findMostSimilar,
  loadEmbeddings,
  type MovieEmbedding,
} from '../src/suggestions';
import { insertMovie } from './helpers/movies';

/* Two dimensions rather than the real 1536: cosine similarity does not care how
   many there are, and a vector you can picture is a vector you can check. */
const catalogue: MovieEmbedding[] = [
  { id: 1, embedding: Float32Array.from([1, 0]) },
  { id: 2, embedding: Float32Array.from([0.9, 0.1]) },
  { id: 3, embedding: Float32Array.from([0, 1]) },
];

describe('cosineSimilarity', () => {
  it('scores a vector against itself as 1', () => {
    /* Deliberately not unit length: scoring 1 here is what proves both
       magnitudes are divided out rather than assumed to be 1. */
    const vector = Float32Array.from([3, 1, 4]);

    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1);
  });

  it('scores vectors at right angles as 0', () => {
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([0, 1]))).toBeCloseTo(0);
  });

  it('scores a vector of all zeros as 0 rather than NaN', () => {
    expect(cosineSimilarity(Float32Array.from([0, 0]), Float32Array.from([1, 1]))).toBe(0);
  });
});

describe('findMostSimilar', () => {
  it('never suggests the movie the suggestions are for', () => {
    const suggestions = findMostSimilar(Float32Array.from([1, 0]), catalogue, new Set([1]), 10);

    expect(suggestions.map((suggestion) => suggestion.id)).toEqual([2, 3]);
  });
});

describe('buildTasteVector', () => {
  it('yields an empty suggestion list when the user has favourited nothing', () => {
    /* The shape the handler has to take: no favourites means no taste vector,
       so there is nothing to scan with and nothing to suggest. */
    const taste = buildTasteVector([]);

    const suggestions =
      taste === undefined ? [] : findMostSimilar(taste, catalogue, new Set<number>(), 10);

    expect(suggestions).toEqual([]);
  });
});

let db: Db;

describe('loadEmbeddings', () => {
  beforeEach(() => {
    db = createDb(':memory:');
    applyMigrations(db, migrationsDir);
  });

  it('skips a movie the dataset shipped without an embedding', () => {
    insertMovie(db, { id: 1, imdbId: 1, plotEmbedding: encodeEmbedding([1, 0]) });
    insertMovie(db, { id: 2, imdbId: 2 });

    expect(loadEmbeddings(db)).toEqual([{ id: 1, embedding: Float32Array.from([1, 0]) }]);
  });
});

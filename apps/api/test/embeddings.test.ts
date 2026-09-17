import { beforeEach, describe, expect, it } from 'vitest';
import { movies } from '@app/contract';
import { applyMigrations, createDb, type Db } from '../src/db';
import { decodeEmbedding, encodeEmbedding } from '../src/embeddings';
import { migrationsDir } from '../src/paths';

let db: Db;

beforeEach(() => {
  db = createDb(':memory:');
  applyMigrations(db, migrationsDir);
});

describe('encodeEmbedding', () => {
  it('writes four bytes for every value', () => {
    expect(encodeEmbedding([1, 2, 3]).byteLength).toBe(12);
  });

  it('writes nothing for an empty vector', () => {
    expect(encodeEmbedding([]).byteLength).toBe(0);
  });
});

describe('decodeEmbedding', () => {
  it('round-trips values that float32 can hold exactly', () => {
    const values = [0, 0.5, -0.25, 1.125, -1024];

    expect([...decodeEmbedding(encodeEmbedding(values))]).toEqual(values);
  });

  it('narrows a value to the nearest float32', () => {
    const [decoded] = decodeEmbedding(encodeEmbedding([0.1]));

    expect(decoded).toBe(Math.fround(0.1));
  });

  it('throws when the byte length is not a multiple of four', () => {
    expect(() => decodeEmbedding(new Uint8Array(7))).toThrow(
      'Expected an embedding whose byte length is a multiple of 4, found 7 bytes',
    );
  });

  it('reads bytes that do not start on a four-byte boundary', () => {
    const padded = new Uint8Array(encodeEmbedding([2.5]).byteLength + 1);
    padded.set(encodeEmbedding([2.5]), 1);

    expect([...decodeEmbedding(padded.subarray(1))]).toEqual([2.5]);
  });
});

describe('the plot_embedding column', () => {
  it('hands back exactly the floats that were stored', () => {
    const values = [0.5, -0.25, 1.75, 0, -8];

    db.insert(movies)
      .values({
        imdbId: 1,
        title: 'A Movie',
        type: 'movie',
        genres: [],
        castMembers: [],
        directors: [],
        writers: [],
        countries: [],
        languages: [],
        plotEmbedding: encodeEmbedding(values),
      })
      .run();

    const stored = db.select().from(movies).get()?.plotEmbedding;

    if (stored === undefined || stored === null) {
      throw new Error('Expected the inserted movie to have a stored embedding, found none');
    }

    expect([...decodeEmbedding(stored)]).toEqual(values);
  });
});

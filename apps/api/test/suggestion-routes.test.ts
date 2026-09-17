import { afterEach, beforeEach, expect, it } from 'vitest';
import type { ContractRouterClient } from '@orpc/contract';
import type { contract } from '@app/contract';
import { applyMigrations, createDb, type Db } from '../src/db';
import { encodeEmbedding } from '../src/embeddings';
import { migrationsDir } from '../src/paths';
import { insertMovie } from './helpers/movies';
import { startTestServer, type TestServer } from './helpers/server';

let db: Db;
let server: TestServer;

beforeEach(async () => {
  db = createDb(':memory:');
  applyMigrations(db, migrationsDir);
  server = await startTestServer(db);
});

afterEach(async () => {
  await server.close();
});

type Client = ContractRouterClient<typeof contract>;

async function signUp(email: string): Promise<Client> {
  const { token } = await server.client.auth.signUp({
    email,
    displayName: email,
    password: 'correct horse',
  });

  return server.clientFor(token);
}

/* Two-dimensional vectors are enough to reason about by hand: these point
   along the axes, so "close" and "unrelated" are obvious by eye. */
function movieWith(imdbId: number, title: string, vector: number[] | null): number {
  return insertMovie(db, {
    imdbId,
    title,
    ...(vector === null ? {} : { plotEmbedding: encodeEmbedding(vector) }),
  });
}

it('suggests the nearest film and never the one being looked at', async () => {
  const alien = movieWith(1, 'Alien', [1, 0]);
  const aliens = movieWith(2, 'Aliens', [0.99, 0.01]);
  movieWith(3, 'Notting Hill', [0, 1]);

  const similar = await server.client.movies.similar({ id: alien });

  expect(similar.map((row) => row.movie.id)).not.toContain(alien);
  expect(similar[0]?.movie.id).toBe(aliens);
});

it('returns the similarity score alongside each film', async () => {
  const alien = movieWith(1, 'Alien', [1, 0]);
  movieWith(2, 'Alien copy', [1, 0]);

  const similar = await server.client.movies.similar({ id: alien });

  expect(similar[0]?.score).toBeCloseTo(1);
});

it('survives two films whose embeddings are identical', async () => {
  /* Floating point: `dot / (sqrt(s) * sqrt(s))` lands a hair above 1 for most
     non-unit vectors, so a `.max(1)` on the output schema would 500 here. The
     other score test uses [1, 0], whose magnitude is exactly 1, and passes
     either way — this one would not. */
  const alien = movieWith(1, 'Alien', [0.2, 0.3, 0.5]);
  movieWith(2, 'Alien again', [0.2, 0.3, 0.5]);

  const similar = await server.client.movies.similar({ id: alien });

  expect(similar[0]?.score).toBeGreaterThan(0.999);
});

it('returns an empty list for a film that has no embedding', async () => {
  const unvectored = movieWith(1, 'No vector', null);
  movieWith(2, 'Alien', [1, 0]);

  await expect(server.client.movies.similar({ id: unvectored })).resolves.toEqual([]);
});

it('never suggests a film that has no embedding', async () => {
  const alien = movieWith(1, 'Alien', [1, 0]);
  movieWith(2, 'No vector', null);

  const similar = await server.client.movies.similar({ id: alien });

  expect(similar).toEqual([]);
});

it('returns NOT_FOUND when asked for neighbours of a film that does not exist', async () => {
  await expect(server.client.movies.similar({ id: 404 })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  });
});

it('suggests nothing until the caller has favourited something', async () => {
  const ada = await signUp('ada@example.com');
  movieWith(1, 'Alien', [1, 0]);

  await expect(ada.suggestions({})).resolves.toEqual([]);
});

it('suggests films close to what the caller favourited', async () => {
  const ada = await signUp('ada@example.com');
  const alien = movieWith(1, 'Alien', [1, 0]);
  const aliens = movieWith(2, 'Aliens', [0.99, 0.01]);
  movieWith(3, 'Notting Hill', [0, 1]);

  await ada.favourites.add({ movieId: alien });
  const suggestions = await ada.suggestions({});

  expect(suggestions[0]?.movie.id).toBe(aliens);
});

it('says which favourite each suggestion came from', async () => {
  const ada = await signUp('ada@example.com');
  const alien = movieWith(1, 'Alien', [1, 0]);
  movieWith(2, 'Aliens', [0.99, 0.01]);

  await ada.favourites.add({ movieId: alien });
  const suggestions = await ada.suggestions({});

  expect(suggestions[0]?.because).toMatchObject({ id: alien, title: 'Alien' });
});

it('never suggests a film the caller has already favourited', async () => {
  const ada = await signUp('ada@example.com');
  const alien = movieWith(1, 'Alien', [1, 0]);
  const aliens = movieWith(2, 'Aliens', [0.99, 0.01]);

  await ada.favourites.add({ movieId: alien });
  await ada.favourites.add({ movieId: aliens });

  await expect(ada.suggestions({})).resolves.toEqual([]);
});

it('refuses to suggest anything to a caller who is not signed in', async () => {
  await expect(server.client.suggestions({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
});

it('never sends an embedding to the caller', async () => {
  const alien = movieWith(1, 'Alien', [1, 0]);
  movieWith(2, 'Aliens', [0.99, 0.01]);

  const similar = await server.client.movies.similar({ id: alien });

  expect(similar.flatMap((row) => Object.keys(row.movie))).not.toContain('plotEmbedding');
});

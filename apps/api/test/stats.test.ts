import { afterEach, beforeEach, expect, it } from 'vitest';
import { applyMigrations, createDb, type Db } from '../src/db';
import { migrationsDir } from '../src/paths';
import { insertMovie, someEmbedding } from './helpers/movies';
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

it('reports zero movies on an empty database', async () => {
  expect(await server.client.stats()).toEqual({
    movieCount: 0,
    moviesWithEmbedding: 0,
    isIngested: false,
  });
});

it('reports the database as ingested once it holds a movie', async () => {
  insertMovie(db, { imdbId: 1 });

  expect((await server.client.stats()).isIngested).toBe(true);
});

it('counts every movie in the table', async () => {
  insertMovie(db, { imdbId: 1, title: 'First' });
  insertMovie(db, { imdbId: 2, title: 'Second' });

  expect((await server.client.stats()).movieCount).toBe(2);
});

it('counts only the movies that have an embedding', async () => {
  insertMovie(db, { imdbId: 1, plotEmbedding: someEmbedding() });
  insertMovie(db, { imdbId: 2, plotEmbedding: null });

  expect(await server.client.stats()).toMatchObject({
    movieCount: 2,
    moviesWithEmbedding: 1,
  });
});

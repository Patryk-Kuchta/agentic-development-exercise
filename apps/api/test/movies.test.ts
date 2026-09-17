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

/**
 * Enough rows to page through, each distinguishable by title, and every one of
 * them sharing a rating so that the default sort is nothing but ties.
 */
function insertNumberedMovies(howMany: number): void {
  for (let number = 1; number <= howMany; number += 1) {
    insertMovie(db, { imdbId: number, title: `Movie ${String(number)}`, imdbRating: 7 });
  }
}

it('returns one page of the requested size rather than the whole table', async () => {
  insertNumberedMovies(30);

  const page = await server.client.movies.list({ page: 1, pageSize: 10 });

  expect(page.items).toHaveLength(10);
});

it('reports the total number of matching movies alongside the page', async () => {
  insertNumberedMovies(30);

  const page = await server.client.movies.list({ page: 1, pageSize: 10 });

  expect(page).toMatchObject({ page: 1, pageSize: 10, total: 30, totalPages: 3 });
});

it('returns different movies on the second page than on the first', async () => {
  /* Every row shares a rating, so the default sort is one long tie and the
     only thing separating the pages is the query's `movies.id` tiebreak.
     SQLite happens to be stable on a small table scan, so this asserts the
     invariant rather than reproducing the bug: drop the tiebreak and the
     guarantee goes with it, even though this scan still looks fine. */
  insertNumberedMovies(20);

  const first = await server.client.movies.list({ page: 1, pageSize: 10 });
  const second = await server.client.movies.list({ page: 2, pageSize: 10 });

  const firstIds = new Set(first.items.map((movie) => movie.id));
  expect(second.items.filter((movie) => firstIds.has(movie.id))).toEqual([]);
});

it('returns only the movies in the requested genre', async () => {
  insertMovie(db, { imdbId: 1, title: 'A Comedy', genres: ['Comedy'] });
  insertMovie(db, { imdbId: 2, title: 'A Drama', genres: ['Drama'] });
  insertMovie(db, { imdbId: 3, title: 'Both', genres: ['Drama', 'Comedy'] });

  const page = await server.client.movies.list({ genre: 'Comedy' });

  expect(page.items.map((movie) => movie.title).sort()).toEqual(['A Comedy', 'Both']);
});

it('treats a genre that looks like SQL as an ordinary value', async () => {
  /* The genre filter is the one predicate written with `sql`, so the claim
     that Drizzle binds it as a parameter is worth holding to a test. */
  insertMovie(db, { imdbId: 1, genres: ['Comedy'] });

  const page = await server.client.movies.list({ genre: "' or 1=1 --" });

  expect(page.total).toBe(0);
});

it('finds a movie by a lowercase fragment of its title', async () => {
  insertMovie(db, { imdbId: 1, title: 'Alien Resurrection' });
  insertMovie(db, { imdbId: 2, title: 'The Godfather' });

  const page = await server.client.movies.list({ search: 'alien' });

  expect(page.items.map((movie) => movie.title)).toEqual(['Alien Resurrection']);
});

it('sorts by rating with the unrated movies last', async () => {
  insertMovie(db, { imdbId: 1, title: 'Unrated', imdbRating: null });
  insertMovie(db, { imdbId: 2, title: 'Good', imdbRating: 7.5 });
  insertMovie(db, { imdbId: 3, title: 'Great', imdbRating: 9.1 });

  const page = await server.client.movies.list({ sort: 'rating' });

  expect(page.items.map((movie) => movie.title)).toEqual(['Great', 'Good', 'Unrated']);
});

it('rejects a page size beyond the allowed maximum', async () => {
  await expect(server.client.movies.list({ pageSize: 100_000 })).rejects.toMatchObject({
    code: 'BAD_REQUEST',
  });
});

it('returns the full movie for a known id', async () => {
  const id = insertMovie(db, { imdbId: 1, title: 'The Godfather', fullplot: 'A family business.' });

  const movie = await server.client.movies.get({ id });

  expect(movie).toMatchObject({ id, title: 'The Godfather', fullplot: 'A family business.' });
});

it('returns NOT_FOUND when the id is unknown', async () => {
  await expect(server.client.movies.get({ id: 404 })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  });
});

it('never includes the plot embedding in a response', async () => {
  const id = insertMovie(db, { imdbId: 1, plotEmbedding: someEmbedding() });

  const movie = await server.client.movies.get({ id });
  const page = await server.client.movies.list({});

  expect(Object.keys(movie)).not.toContain('plotEmbedding');
  expect(page.items.flatMap((item) => Object.keys(item))).not.toContain('plotEmbedding');
});

it('lists each genre once, sorted', async () => {
  insertMovie(db, { imdbId: 1, genres: ['Drama', 'Comedy'] });
  insertMovie(db, { imdbId: 2, genres: ['Comedy'] });
  insertMovie(db, { imdbId: 3, genres: [] });

  expect(await server.client.movies.genres()).toEqual(['Comedy', 'Drama']);
});

it('routes /movies/genres to the genre list and not to the movie lookup', async () => {
  /* `/movies/genres` and `/movies/{id}` both match this URL. If the handler
     picked `{id}`, "genres" would fail the id schema and this would reject
     with BAD_REQUEST instead of answering. */
  insertMovie(db, { imdbId: 1, genres: ['Sci-Fi'] });

  await expect(server.client.movies.genres()).resolves.toEqual(['Sci-Fi']);
});

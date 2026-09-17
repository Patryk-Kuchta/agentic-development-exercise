import { afterEach, beforeEach, expect, it } from 'vitest';
import type { ContractRouterClient } from '@orpc/contract';
import { type contract, favourites } from '@app/contract';
import { applyMigrations, createDb, type Db } from '../src/db';
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

/** A signed-in client, which is what most of these tests actually need. */
async function signUp(email: string): Promise<Client> {
  const { token } = await server.client.auth.signUp({
    email,
    displayName: email,
    password: 'correct horse',
  });

  return server.clientFor(token);
}

it('adds a film to the caller’s favourites', async () => {
  const ada = await signUp('ada@example.com');
  const id = insertMovie(db, { imdbId: 1, title: 'Alien' });

  expect(await ada.favourites.add({ movieId: id })).toEqual({ movieId: id, isFavourite: true });
});

it('removes a film from the caller’s favourites', async () => {
  const ada = await signUp('ada@example.com');
  const id = insertMovie(db, { imdbId: 1, title: 'Alien' });

  await ada.favourites.add({ movieId: id });

  expect(await ada.favourites.remove({ movieId: id })).toEqual({ movieId: id, isFavourite: false });
});

it('keeps one row when the same film is favourited twice', async () => {
  const ada = await signUp('ada@example.com');
  const id = insertMovie(db, { imdbId: 1, title: 'Alien' });

  await ada.favourites.add({ movieId: id });
  await ada.favourites.add({ movieId: id });

  expect(db.select().from(favourites).all()).toHaveLength(1);
});

it('succeeds at removing a favourite that was never there', async () => {
  const ada = await signUp('ada@example.com');
  const id = insertMovie(db, { imdbId: 1, title: 'Alien' });

  await expect(ada.favourites.remove({ movieId: id })).resolves.toMatchObject({
    isFavourite: false,
  });
});

it('returns NOT_FOUND when favouriting a film that does not exist', async () => {
  const ada = await signUp('ada@example.com');

  await expect(ada.favourites.add({ movieId: 404 })).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

it('refuses to favourite anything for a caller who is not signed in', async () => {
  const id = insertMovie(db, { imdbId: 1, title: 'Alien' });

  await expect(server.client.favourites.add({ movieId: id })).rejects.toMatchObject({
    code: 'UNAUTHORIZED',
  });
});

it('tells a signed-in caller which films in a list are theirs', async () => {
  const ada = await signUp('ada@example.com');
  const alien = insertMovie(db, { imdbId: 1, title: 'Alien' });
  insertMovie(db, { imdbId: 2, title: 'The Third Man' });

  await ada.favourites.add({ movieId: alien });
  const page = await ada.movies.list({ sort: 'title' });

  expect(page.items.map((movie) => [movie.title, movie.isFavourite])).toEqual([
    ['Alien', true],
    ['The Third Man', false],
  ]);
});

it('reports every film as not favourited for an anonymous caller', async () => {
  const ada = await signUp('ada@example.com');
  const alien = insertMovie(db, { imdbId: 1, title: 'Alien' });

  await ada.favourites.add({ movieId: alien });
  const page = await server.client.movies.list({});

  expect(page.items.map((movie) => movie.isFavourite)).toEqual([false]);
});

it('tells a signed-in caller whether the film they opened is theirs', async () => {
  const ada = await signUp('ada@example.com');
  const id = insertMovie(db, { imdbId: 1, title: 'Alien' });

  await ada.favourites.add({ movieId: id });

  expect(await ada.movies.get({ id })).toMatchObject({ isFavourite: true });
});

it('narrows the movie list to the caller’s favourites when asked', async () => {
  const ada = await signUp('ada@example.com');
  const alien = insertMovie(db, { imdbId: 1, title: 'Alien' });
  insertMovie(db, { imdbId: 2, title: 'The Third Man' });

  await ada.favourites.add({ movieId: alien });
  const page = await ada.movies.list({ favouritesOnly: 'true' });

  expect(page.items.map((movie) => movie.title)).toEqual(['Alien']);
});

it('combines the favourites filter with the other filters rather than replacing them', async () => {
  const ada = await signUp('ada@example.com');
  const alien = insertMovie(db, { imdbId: 1, title: 'Alien', genres: ['Horror'] });
  const third = insertMovie(db, { imdbId: 2, title: 'The Third Man', genres: ['Thriller'] });

  await ada.favourites.add({ movieId: alien });
  await ada.favourites.add({ movieId: third });
  const page = await ada.movies.list({ favouritesOnly: 'true', genre: 'Horror' });

  expect(page.items.map((movie) => movie.title)).toEqual(['Alien']);
});

it('returns an empty page rather than an error when an anonymous caller asks for favourites only', async () => {
  insertMovie(db, { imdbId: 1, title: 'Alien' });

  const page = await server.client.movies.list({ favouritesOnly: 'true' });

  expect(page).toMatchObject({ items: [], total: 0 });
});

it('keeps two people’s favourites apart', async () => {
  const ada = await signUp('ada@example.com');
  const grace = await signUp('grace@example.com');
  const id = insertMovie(db, { imdbId: 1, title: 'Alien' });

  await ada.favourites.add({ movieId: id });

  expect((await grace.movies.list({ favouritesOnly: 'true' })).items).toEqual([]);
  expect((await ada.movies.list({ favouritesOnly: 'true' })).items).toHaveLength(1);
});

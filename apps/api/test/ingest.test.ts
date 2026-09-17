import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { movies } from '@app/contract';
import { applyMigrations, createDb, type Db } from '../src/db';
import { decodeEmbedding } from '../src/embeddings';
import { fetchDatasetPage } from '../src/ingest/dataset';
import { ingestMovies, type FetchPage } from '../src/ingest/ingest';
import { migrationsDir } from '../src/paths';

/**
 * The dataset server is never called here. `ingestMovies` takes its page
 * fetcher as an option precisely so a test can hand it a list of rows, which
 * also means these rows go through the same Zod boundary that real ones do.
 */

let db: Db;

beforeEach(() => {
  db = createDb(':memory:');
  applyMigrations(db, migrationsDir);
  /* Skipped rows and progress are reported on the console; the assertions
     read the return value, so the noise is silenced. */
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** One row shaped exactly like `MongoDB/embedded_movies` serves it. */
function datasetRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'The Perils of Pauline',
    type: 'movie',
    plot: 'Young Pauline is left a lot of money.',
    fullplot: 'Young Pauline is left a lot of money, and trouble follows.',
    poster: 'https://example.test/pauline.jpg',
    rated: null,
    runtime: 199,
    metacritic: null,
    num_mflix_comments: 0,
    genres: ['Action'],
    cast: ['Pearl White', 'Crane Wilbur'],
    directors: ['Louis J. Gasnier'],
    writers: ['Charles W. Goddard (screenplay)'],
    countries: ['USA'],
    languages: ['English'],
    imdb: { id: 4465, rating: 7.6, votes: 744 },
    awards: { wins: 1, nominations: 0, text: '1 win.' },
    plot_embedding: [0.5, -0.25, 0.125],
    ...overrides,
  };
}

interface FakeServer {
  fetchPage: FetchPage;
  requests: { offset: number; length: number }[];
}

function fakeServer(rows: readonly unknown[]): FakeServer {
  const requests: { offset: number; length: number }[] = [];

  return {
    requests,
    fetchPage: (offset, length) => {
      requests.push({ offset, length });
      return Promise.resolve({
        totalRows: rows.length,
        rows: rows.slice(offset, offset + length),
      });
    },
  };
}

function storedMovies() {
  return db.select().from(movies).all();
}

describe('ingestMovies', () => {
  it('stores every row the dataset serves', async () => {
    const rows = [datasetRow({ imdb: { id: 1, rating: 7, votes: 10 } }), datasetRow()];

    const summary = await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    expect(summary.upserted).toBe(2);
    expect(storedMovies()).toHaveLength(2);
  });

  it('reports how many rows the dataset holds in total', async () => {
    const summary = await ingestMovies(db, { fetchPage: fakeServer([datasetRow()]).fetchPage });

    expect(summary.totalAvailable).toBe(1);
  });

  it('pages through rows until the dataset runs out', async () => {
    const rows = Array.from({ length: 5 }, (_unused, index) =>
      datasetRow({ imdb: { id: index + 1, rating: 7, votes: 1 } }),
    );
    const server = fakeServer(rows);

    await ingestMovies(db, { fetchPage: server.fetchPage, pageSize: 2 });

    expect(server.requests.map((request) => request.offset)).toEqual([0, 2, 4]);
    expect(storedMovies()).toHaveLength(5);
  });

  it('never asks for more than a hundred rows at a time', async () => {
    const server = fakeServer([datasetRow()]);

    await ingestMovies(db, { fetchPage: server.fetchPage, pageSize: 5000 });

    expect(server.requests.every((request) => request.length <= 100)).toBe(true);
  });

  it('leaves the movie count unchanged when it runs twice', async () => {
    const rows = [datasetRow({ imdb: { id: 1, rating: 7, votes: 10 } }), datasetRow()];

    await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });
    await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    expect(storedMovies()).toHaveLength(2);
  });

  it('collapses two rows that share an imdb id into one movie', async () => {
    const rows = [
      datasetRow({ title: 'First telling', imdb: { id: 7, rating: 6, votes: 1 } }),
      datasetRow({ title: 'Second telling', imdb: { id: 7, rating: 6, votes: 1 } }),
    ];

    const summary = await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    expect(summary.upserted).toBe(2);
    expect(storedMovies()).toHaveLength(1);
  });

  it('keeps the values of the last row carrying a repeated imdb id', async () => {
    const rows = [
      datasetRow({ title: 'First telling', imdb: { id: 7, rating: 6, votes: 1 } }),
      datasetRow({ title: 'Second telling', imdb: { id: 7, rating: 6, votes: 1 } }),
    ];

    await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    expect(storedMovies().map((movie) => movie.title)).toEqual(['Second telling']);
  });

  it('stores a movie whose plot embedding is missing', async () => {
    const rows = [datasetRow({ plot_embedding: null })];

    await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    expect(storedMovies()).toHaveLength(1);
  });

  it('counts only the rows that carried an embedding', async () => {
    const rows = [
      datasetRow({ imdb: { id: 1, rating: 7, votes: 1 }, plot_embedding: null }),
      datasetRow({ imdb: { id: 2, rating: 7, votes: 1 } }),
    ];

    const summary = await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    expect(summary.withEmbedding).toBe(1);
  });

  it('decodes a stored embedding back to the numbers the dataset sent', async () => {
    const rows = [datasetRow({ plot_embedding: [0.5, -0.25, 0.125] })];

    await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    const stored = db.select().from(movies).get()?.plotEmbedding;
    if (stored === undefined || stored === null) {
      throw new Error('Expected the ingested movie to have an embedding, found none');
    }

    expect([...decodeEmbedding(stored)]).toEqual([0.5, -0.25, 0.125]);
  });

  it("maps the dataset's cast onto the castMembers column", async () => {
    await ingestMovies(db, { fetchPage: fakeServer([datasetRow()]).fetchPage });

    expect(storedMovies().at(0)?.castMembers).toEqual(['Pearl White', 'Crane Wilbur']);
  });

  it('reads an empty imdb rating as unknown rather than as zero', async () => {
    const rows = [datasetRow({ imdb: { id: 1, rating: '', votes: '' } })];

    await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    expect(storedMovies().at(0)?.imdbRating).toBeNull();
  });

  it('turns a missing cast list into an empty one', async () => {
    await ingestMovies(db, { fetchPage: fakeServer([datasetRow({ cast: null })]).fetchPage });

    expect(storedMovies().at(0)?.castMembers).toEqual([]);
  });

  it('stops fetching once the limit is reached', async () => {
    const rows = Array.from({ length: 10 }, (_unused, index) =>
      datasetRow({ imdb: { id: index + 1, rating: 7, votes: 1 } }),
    );

    const summary = await ingestMovies(db, {
      fetchPage: fakeServer(rows).fetchPage,
      pageSize: 2,
      limit: 4,
    });

    expect(summary.fetched).toBe(4);
    expect(storedMovies()).toHaveLength(4);
  });

  it('counts a row the dataset schema rejects as skipped', async () => {
    const rows = [datasetRow({ imdb: { id: 'not-a-number', rating: 7, votes: 1 } }), datasetRow()];

    const summary = await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    expect(summary.skipped).toBe(1);
    expect(summary.upserted).toBe(1);
  });

  it('says on the console which row it skipped', async () => {
    const warn = vi.spyOn(console, 'warn');
    const rows = [datasetRow({ imdb: { id: 'not-a-number', rating: 7, votes: 1 } })];

    await ingestMovies(db, { fetchPage: fakeServer(rows).fetchPage });

    expect(warn.mock.calls.flat().join('\n')).toContain('Skipping dataset row 0');
  });

  it('reports progress once per page', async () => {
    const rows = Array.from({ length: 4 }, (_unused, index) =>
      datasetRow({ imdb: { id: index + 1, rating: 7, votes: 1 } }),
    );
    const seen: number[] = [];

    await ingestMovies(db, {
      fetchPage: fakeServer(rows).fetchPage,
      pageSize: 2,
      onProgress: (fetched) => seen.push(fetched),
    });

    expect(seen).toEqual([2, 4]);
  });
});

/**
 * `fetch` is replaced, not called: these tests describe how the boundary
 * reacts to the datasets server, and a test that needs the internet is a test
 * that fails on a train.
 */
describe('fetchDatasetPage', () => {
  function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('returns the rows the server sent', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(jsonResponse({ num_rows_total: 2, rows: [{ row: datasetRow() }] })),
    );

    const page = await fetchDatasetPage(0, 100);

    expect(page.totalRows).toBe(2);
    expect(page.rows).toHaveLength(1);
  });

  it('retries a bad gateway before giving up', async () => {
    let attempts = 0;
    vi.stubGlobal('fetch', () => {
      attempts += 1;
      return Promise.resolve(
        attempts === 1
          ? new Response('', { status: 502, statusText: 'Bad Gateway' })
          : jsonResponse({ num_rows_total: 0, rows: [] }),
      );
    });

    await fetchDatasetPage(0, 100);

    expect(attempts).toBe(2);
  });

  it('does not retry a response the server will keep refusing', async () => {
    let attempts = 0;
    vi.stubGlobal('fetch', () => {
      attempts += 1;
      return Promise.resolve(new Response('', { status: 404, statusText: 'Not Found' }));
    });

    await expect(fetchDatasetPage(0, 100)).rejects.toThrow('404 Not Found');
    expect(attempts).toBe(1);
  });

  it('names the url it could not read', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response('', { status: 404, statusText: 'Not Found' })),
    );

    await expect(fetchDatasetPage(40, 100)).rejects.toThrow('offset=40');
  });

  it('rejects a payload that is not a page of rows', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(jsonResponse({ oops: true })));

    await expect(fetchDatasetPage(0, 100)).rejects.toThrow('num_rows_total');
  });

  it('asks for no more than the hundred rows the api allows', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      seen.push(url);
      return Promise.resolve(jsonResponse({ num_rows_total: 0, rows: [] }));
    });

    await fetchDatasetPage(0, 5000);

    expect(seen.at(0)).toContain('length=100');
  });
});

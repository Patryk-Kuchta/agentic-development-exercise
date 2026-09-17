import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiOutputs } from '../api/client';
import { AuthProvider } from '../auth/AuthProvider';
import { MovieDetailPage } from './MovieDetailPage';

/* The oRPC link binds `globalThis.fetch` when it is constructed, which happens
   while `../api/client` is imported. `vi.hoisted` runs before the imports above,
   so the stub is in place in time to be the one the link captures. */
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<(request: Request) => Promise<Response>>();
  vi.stubGlobal('fetch', mock);
  return mock;
});

type Movie = ApiOutputs['movies']['get'];

/* Typed by the contract, so the fixture cannot drift from what the API sends. */
function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 42,
    imdbId: 47478,
    isFavourite: false,
    title: 'Seven Samurai',
    type: 'movie',
    plot: 'A poor village hires seven samurai.',
    fullplot: 'A poor village under attack by bandits recruits seven unemployed samurai.',
    poster: null,
    rated: 'NOT RATED',
    runtime: 207,
    genres: ['Action', 'Drama'],
    castMembers: ['Toshirô Mifune', 'Takashi Shimura'],
    directors: ['Akira Kurosawa'],
    writers: ['Akira Kurosawa'],
    countries: ['Japan'],
    languages: ['Japanese'],
    imdbRating: 8.7,
    imdbVotes: 229_083,
    metacritic: 98,
    awardsWins: 5,
    awardsNominations: 6,
    awardsText: 'Nominated for 2 Oscars. Another 5 wins & 6 nominations.',
    numMflixComments: 0,
    ingestedAt: '2026-09-17 07:35:18',
    ...overrides,
  };
}

function respondWithMovie(payload: Movie) {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

/* The shape an oRPC handler sends for a declared error: the client turns this
   back into a *defined* ORPCError, which is what the page branches on. */
function respondWithNotFound() {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({ defined: true, code: 'NOT_FOUND', status: 404, message: 'Not Found' }),
      { status: 404, headers: { 'content-type': 'application/json' } },
    ),
  );
}

function renderDetailPage(path: string) {
  /* retry: false keeps the 404 test from waiting out React Query's backoff. */
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider env="test">
        {/* The heart asks who is signed in. jsdom has no stored token, so the
            session query stays disabled and these render signed-out. */}
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/movies/:id" element={<MovieDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe('MovieDetailPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("renders the film's title and plot", async () => {
    respondWithMovie(movie());
    renderDetailPage('/movies/42');

    expect(await screen.findByRole('heading', { name: 'Seven Samurai' })).toBeDefined();
    expect(
      screen.getByText('A poor village under attack by bandits recruits seven unemployed samurai.'),
    ).toBeDefined();
  });

  it('renders the cast, directors, countries and awards', async () => {
    respondWithMovie(movie());
    renderDetailPage('/movies/42');

    expect(await screen.findByText('Toshirô Mifune, Takashi Shimura')).toBeDefined();
    /* Kurosawa both wrote and directed it, so he appears in two rows. */
    expect(screen.getAllByText('Akira Kurosawa')).toHaveLength(2);
    expect(screen.getByText('Japan')).toBeDefined();
    expect(
      screen.getByText('Nominated for 2 Oscars. Another 5 wins & 6 nominations.'),
    ).toBeDefined();
  });

  it('says so rather than rendering a blank when a field is missing', async () => {
    respondWithMovie(movie({ fullplot: null, plot: null, directors: [] }));
    renderDetailPage('/movies/42');

    expect(await screen.findByText('No plot on file for this film.')).toBeDefined();
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0);
  });

  it('shows a not-found state when the id is unknown', async () => {
    respondWithNotFound();
    renderDetailPage('/movies/999999');

    expect(await screen.findByText('We do not have that film')).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Seven Samurai' })).toBeNull();
  });

  it('shows a not-found state for an id that is not a number, without calling the API', async () => {
    renderDetailPage('/movies/banana');

    expect(await screen.findByText('We do not have that film')).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('links back to the list', async () => {
    respondWithMovie(movie({ title: 'Seven Samurai' }));
    renderDetailPage('/movies/42');

    const back = await screen.findByRole('link', { name: /Back to the list/ });

    expect(back.getAttribute('href')).toBe('/movies');
  });
});

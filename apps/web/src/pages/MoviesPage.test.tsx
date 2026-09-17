import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiOutputs } from '../api/client';
import { MoviesPage } from './MoviesPage';

/* The oRPC link binds `globalThis.fetch` when it is constructed, which happens
   while `../api/client` is imported. `vi.hoisted` runs before the imports above,
   so the stub is in place in time to be the one the link captures. */
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<(request: Request) => Promise<Response>>();
  vi.stubGlobal('fetch', mock);
  return mock;
});

/* Both payloads are typed by the contract, so a column that changes upstream
   breaks these fixtures at compile time instead of at review time. */
type MoviePage = ApiOutputs['movies']['list'];
type MovieSummary = MoviePage['items'][number];

function summary(overrides: Partial<MovieSummary> & Pick<MovieSummary, 'id' | 'title'>) {
  return {
    type: 'movie',
    poster: null,
    genres: ['Drama'],
    imdbRating: 7.5,
    runtime: 102,
    rated: 'PG',
    plot: 'Something happens to someone.',
    ...overrides,
  } satisfies MovieSummary;
}

function pageOf(items: MovieSummary[], overrides: Partial<MoviePage> = {}): MoviePage {
  return {
    items,
    page: 1,
    pageSize: 24,
    total: items.length,
    totalPages: 1,
    ...overrides,
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** Routes by path so the genre dropdown and the grid get their own payloads. */
function respondWith(moviePage: MoviePage, genres: string[] = ['Comedy', 'Drama']) {
  fetchMock.mockImplementation((request) => {
    const { pathname } = new URL(request.url);

    return Promise.resolve(
      pathname.endsWith('/movies/genres') ? jsonResponse(genres) : jsonResponse(moviePage),
    );
  });
}

/** Every list URL the component has asked for, newest last. */
function listRequests(): URL[] {
  return fetchMock.mock.calls
    .map(([request]) => new URL(request.url))
    .filter((url) => !url.pathname.endsWith('/movies/genres'));
}

/* Renders the current query string so a test can assert that the filters really
   landed in the URL, which is what makes a filtered list shareable. */
function LocationProbe() {
  const location = useLocation();

  return <output data-testid="location-search">{location.search}</output>;
}

function renderMoviesPage(initialPath = '/movies') {
  /* retry: false keeps the error paths from waiting out React Query's backoff. */
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider env="test">
        <MemoryRouter initialEntries={[initialPath]}>
          <MoviesPage />
          <LocationProbe />
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe('MoviesPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('renders a card for every movie the API returns', async () => {
    respondWith(
      pageOf([
        summary({ id: 1, title: 'Seven Samurai' }),
        summary({ id: 2, title: 'The Third Man' }),
      ]),
    );
    renderMoviesPage();

    expect(await screen.findByText('Seven Samurai')).toBeDefined();
    expect(screen.getByText('The Third Man')).toBeDefined();
  });

  it('shows a placeholder instead of a broken image when a film has no poster', async () => {
    respondWith(pageOf([summary({ id: 1, title: 'Seven Samurai', poster: null })]));
    renderMoviesPage();

    expect(await screen.findByText('No poster')).toBeDefined();
  });

  it('asks the API for the page named in the URL', async () => {
    respondWith(pageOf([summary({ id: 1, title: 'Seven Samurai' })], { page: 3, totalPages: 9 }));
    renderMoviesPage('/movies?page=3');

    await screen.findByText('Seven Samurai');

    expect(listRequests().at(-1)?.searchParams.get('page')).toBe('3');
  });

  it('moves to the next page when a pager control is clicked', async () => {
    const user = userEvent.setup();
    respondWith(pageOf([summary({ id: 1, title: 'Seven Samurai' })], { total: 50, totalPages: 3 }));
    renderMoviesPage();

    await screen.findByText('Seven Samurai');
    await user.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(listRequests().at(-1)?.searchParams.get('page')).toBe('2');
    });
  });

  it('sends the typed search term to the API', async () => {
    const user = userEvent.setup();
    respondWith(pageOf([summary({ id: 1, title: 'Alien' })]));
    renderMoviesPage();

    await screen.findByText('Alien');
    await user.type(screen.getByLabelText('Search'), 'alien');

    await waitFor(() => {
      expect(listRequests().at(-1)?.searchParams.get('search')).toBe('alien');
    });
  });

  it('puts the search term in the URL so the list can be linked to', async () => {
    const user = userEvent.setup();
    respondWith(pageOf([summary({ id: 1, title: 'Alien' })]));
    renderMoviesPage();

    await screen.findByText('Alien');
    await user.type(screen.getByLabelText('Search'), 'alien');

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toBe('?q=alien');
    });
  });

  it('returns to page 1 when a filter changes, so the user is not left past the end', async () => {
    const user = userEvent.setup();
    respondWith(pageOf([summary({ id: 1, title: 'Alien' })], { page: 7, totalPages: 9 }));
    renderMoviesPage('/movies?page=7');

    await screen.findByText('Alien');
    await user.type(screen.getByLabelText('Search'), 'a');

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toBe('?q=a');
    });
  });

  it('links each card to its detail page', async () => {
    respondWith(pageOf([summary({ id: 42, title: 'Alien' })]));
    renderMoviesPage();

    const link = await screen.findByRole('link', { name: /Alien/ });

    expect(link.getAttribute('href')).toBe('/movies/42');
  });

  it('renders an empty state when no film matches the filters', async () => {
    respondWith(pageOf([], { total: 0, totalPages: 0 }));
    renderMoviesPage('/movies?q=nothingmatchesthis');

    expect(await screen.findByText('No films match those filters')).toBeDefined();
  });

  it('shows an error alert when the API cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'));
    renderMoviesPage();

    expect(await screen.findByText('Could not load the movies')).toBeDefined();
  });
});

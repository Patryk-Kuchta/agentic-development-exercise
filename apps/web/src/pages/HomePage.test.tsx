import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiOutputs } from '../api/client';
import { HomePage } from './HomePage';

/* The oRPC link binds `globalThis.fetch` when it is constructed, which happens
   while `../api/client` is imported. `vi.hoisted` runs before the imports above,
   so the stub is in place in time to be the one the link captures. */
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<(request: Request) => Promise<Response>>();
  vi.stubGlobal('fetch', mock);
  return mock;
});

/* The payload is typed by the contract, so a stats field added later breaks this
   stub at compile time rather than silently returning the wrong shape. */
function respondWithStats(stats: ApiOutputs['stats']) {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

function renderHomePage() {
  /* retry: false keeps the error test from waiting out React Query's backoff. */
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider env="test">
        <HomePage />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('renders the product name', () => {
    respondWithStats({ movieCount: 42, moviesWithEmbedding: 40, isIngested: true });
    renderHomePage();

    expect(screen.getByRole('heading', { name: 'Movie Suggester' })).toBeDefined();
  });

  it('renders the ingested movie count once the stats load', async () => {
    respondWithStats({ movieCount: 42, moviesWithEmbedding: 40, isIngested: true });
    renderHomePage();

    expect(await screen.findByText('42')).toBeDefined();
    expect(screen.getByText('Movies ingested')).toBeDefined();
  });

  it('tells the learner to run npm run ingest when nothing is ingested', async () => {
    respondWithStats({ movieCount: 0, moviesWithEmbedding: 0, isIngested: false });
    renderHomePage();

    expect(await screen.findByText('npm run ingest')).toBeDefined();
    expect(screen.queryByText('Movies ingested')).toBeNull();
  });

  it('shows an error alert when the API cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'));
    renderHomePage();

    expect(await screen.findByText('Could not reach the API')).toBeDefined();
  });
});

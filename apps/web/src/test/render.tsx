import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

import { AuthProvider } from '../auth/AuthProvider';

/**
 * Renders a page inside every provider the app gives it: React Query, Mantine,
 * the auth context and a router.
 *
 * It lives here because every page needs all four, and a test that forgets one
 * fails with a stack trace from inside a library rather than a useful message.
 * `retry: false` keeps the error paths from waiting out React Query's backoff.
 *
 * jsdom has no stored token, so `AuthProvider` settles as signed-out and its
 * `me` query never fires. A test that needs a signed-in user stubs `/auth/me`.
 */
export function renderPage(ui: ReactNode, initialPath = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider env="test">
        <AuthProvider>
          <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

/** A JSON response, which is all the oRPC link needs back from a stubbed fetch. */
export function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

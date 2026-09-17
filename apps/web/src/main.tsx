/* Mantine stylesheets must be imported before any component styles, core first:
   @mantine/notifications builds on the Notification styles shipped in core. */
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { AuthProvider } from './auth/AuthProvider';
import { router } from './router';
import { theme } from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Cannot mount the app: no element with id "root" in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Notifications />
        {/* Inside QueryClientProvider, because it asks the API who owns the
            stored token; outside the router, so every page sees the answer. */}
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
);

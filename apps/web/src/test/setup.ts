import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/* `@testing-library/jest-dom` is deliberately not imported: it is not a dependency
   of this workspace. Assert with plain `expect` and Testing Library queries. */

/* jsdom ships no `matchMedia`, and MantineProvider calls it on mount to resolve
   `defaultColorScheme="auto"`. A stub that always reports "no match" is enough. */
window.matchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

afterEach(() => {
  cleanup();
});

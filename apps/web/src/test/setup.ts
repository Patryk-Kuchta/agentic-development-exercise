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

/* jsdom ships no `ResizeObserver` either, and Mantine's `Select` mounts its
   dropdown inside a `ScrollArea` that observes its own size. Nothing in jsdom
   has a size, so an observer that never reports anything is the honest stub. */
globalThis.ResizeObserver = class {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
};

afterEach(() => {
  cleanup();
});

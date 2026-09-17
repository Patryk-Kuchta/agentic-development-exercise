# apps/web

Vite + React 19 + Mantine 9 + TanStack Query 5 + react-router 8. TypeScript only.

## The one rule that matters here

**Data comes from the contract, never from `fetch`.** `src/api/client.ts` turns
`packages/contract` into a typed client and a set of React Query helpers. Adding a
procedure to the contract makes it appear here with no wiring. If you find yourself writing
a URL string, a request body type, or a response `interface`, stop — all three already
exist upstream.

```tsx
const { data, isPending, isError } = useQuery(orpc.stats.queryOptions());
```

## Layout

| Path              | Holds                                                 |
| ----------------- | ----------------------------------------------------- |
| `src/api/`        | the generated client and React Query utils            |
| `src/pages/`      | one component per route, named export, colocated test |
| `src/components/` | anything used by more than one page                   |
| `src/router.tsx`  | the route table                                       |
| `src/theme.ts`    | Mantine theme and component defaults                  |

## New to React?

`.claude/skills/learn-the-frontend/SKILL.md` translates React, Mantine and React Query from
whatever UI you have built before; `learn-this-stack` does the language side. The three that
bite hardest whatever your background:

- A component is a **function that re-runs**, not an object that persists. There are no
  fields; `useState` is where a value survives a re-render.
- **Server data is cache, not state.** React Query is `HttpClient` + `IMemoryCache` + change
  notification. Do not copy a response into `useState`; you will then own two truths.
- `useEffect` is not `OnInitializedAsync`. Fetching belongs in React Query, deriving belongs
  in the render body. Most `useEffect` calls in a codebase this size are a mistake.

## Before you write a helper

Check `.claude/skills/use-the-library/SKILL.md`. Mantine already has the table, the modal,
the pagination, the notification and the form state; React Query already has loading, error,
invalidation and optimistic updates. A hand-rolled version of any of them will be sent back.

Use React Query's own flags — `isPending`, `isError`, `error` — for the three states. A
`useState` loading boolean is the wrong answer.

## Two traps already paid for

1. **`OpenAPILink` will not take a relative URL.** `{ url: '/api' }` throws
   `TypeError: Invalid URL`, because the codec calls `new URL(baseUrl)` with no base.
   `new URL('/api', window.location.origin)` is the fix, and it keeps the app same-origin so
   the Vite proxy still works and CORS is still unnecessary.
2. **The link captures `globalThis.fetch` when `client.ts` is first imported.** A
   `vi.stubGlobal('fetch', …)` inside `beforeEach` runs too late and is silently ignored.
   Install network stubs with `vi.hoisted(…)`, which runs before ESM imports.

## Testing

Testing Library + jsdom. `@testing-library/jest-dom` is deliberately **not** a dependency —
assert with plain `expect` and Testing Library queries. Render inside the providers the
component needs (`MantineProvider`, `QueryClientProvider` with `retry: false`), and stub the
network at the `fetch` boundary rather than mocking your own client, so the test exercises
the real contract types.

---
name: frontend-for-csharp-devs
description: Translate Blazor/Razor/MVC concepts into React 19, Mantine and TanStack Query as used in apps/web. Use when writing or reviewing frontend code with a Blazor or ASP.NET background.
---

For devs who know Blazor, Razor Pages or MVC. Only the differences that bite.

## The map

| Blazor / ASP.NET                  | Here                             | Where it breaks down                                                  |
| --------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| `.razor` component                | a function returning JSX         | No class, no lifecycle overrides, no `@code` block                    |
| `[Parameter]`                     | props — the function's argument  | Read-only. Always. A child never assigns to a prop                    |
| component field / `@bind`         | `useState`                       | State lives outside the function; the function is re-run, not mutated |
| `StateHasChanged()`               | calling the setter               | You never tell React to render; setting state is the signal           |
| `OnInitializedAsync` for data     | TanStack Query `useQuery`        | Not `useEffect` — see below                                           |
| `HttpClient` + `IMemoryCache`     | TanStack Query                   | The cache _is_ the API layer, not a thing you add around it           |
| `@page "/movies/{id:int}"`        | react-router route + `useParams` | Routing is client-side; params are strings, parse them                |
| Tag helpers / a component library | Mantine 9                        | Import components; no server render of HTML                           |
| `IServiceProvider` / DI           | props, hooks, React context      | No container, no lifetimes, no constructor injection                  |

## JSX vs Razor

Both mix markup and code. The direction is opposite: Razor is HTML with `@code`
escapes; JSX is **JavaScript** with markup literals.

```tsx
export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Card>
      <Text fw={600}>{movie.title}</Text>
      {movie.genres.map((g) => (
        <Badge key={g}>{g}</Badge>
      ))}
    </Card>
  );
}
```

| Razor         | JSX                                            |
| ------------- | ---------------------------------------------- |
| `@foreach`    | `.map(...)` returning elements, with `key`     |
| `@if (x) { }` | `{x ? <A /> : null}` or `{x && <A />}`         |
| `class=`      | `className=`                                   |
| `onclick=`    | `onClick={handler}` — a function, not a string |
| `@model`      | the props argument                             |

`key` on a mapped list is not optional: it is how React matches elements across
renders.

## Re-render is not re-instantiate

The single biggest mental shift. When state changes React **calls your function
again** — top to bottom, every time. There is no long-lived component instance
whose fields you mutate.

- A `const` inside the component is recreated every render. That is fine and cheap.
- State survives between renders because `useState` stores it outside the function.
- Never mutate state — `movies.push(x)` changes nothing React can see. Produce a
  new value: `setMovies([...movies, x])`.

## `useEffect`: usually the wrong tool

`useEffect` is not `OnInitializedAsync`. It is an escape hatch for synchronising
with something **outside** React.

| Want                                      | Use                                           |
| ----------------------------------------- | --------------------------------------------- |
| Server data                               | `useQuery` — never a fetch in `useEffect`     |
| Derived value                             | compute it during render; no state, no effect |
| Respond to a click                        | the event handler                             |
| Reset state on prop change                | a `key` on the component                      |
| Subscribe to a browser API, timer, socket | `useEffect` — genuinely                       |

If you reach for `useEffect` to load data or to keep two states in sync, stop.

## Server state is cache, not state

TanStack Query replaces `HttpClient` + `IMemoryCache` + your loading booleans.

```tsx
const { data, isPending, isError, error } = useQuery(orpc.stats.queryOptions());
```

- `isPending` / `isError` come free — do not track loading in `useState`.
- After a write, `invalidateQueries` refetches. No manual refresh counter.
- Data fetched once is shared by every component that asks for the same key.
- Treat it as a cache of the server's truth, never as your own copy to edit.

## Mantine

Mantine 9 is the component library: `Card`, `Stack`, `Group`, `Grid`, `Table`,
`Pagination`, `TextInput`, `Select`, `Modal`, notifications, theming, dark mode.
Check `use-the-library` before hand-rolling anything — a bespoke flex wrapper or
a wrapped `<input>` is a review failure.

Forms: `@mantine/form`'s `useForm` with `mantine-form-zod-resolver`, not
`useState` per field.

## Routing

react-router, client side. The server serves one HTML file; navigation swaps
components without a request. `useParams()` gives you **strings** — parse them.
Shareable state (page number, search text, filters) belongs in the query string,
not in `useState`.

## This repo's rule: never `fetch`

Data comes from the generated oRPC hooks, typed by
`packages/contract/src/contract.ts`:

```ts
const orpc = createTanstackQueryUtils(client);
useQuery(orpc.stats.queryOptions());
```

A hand-written `fetch`, an axios call, or a hand-declared response type is a
second definition of the contract, and it will drift. If the hook does not have
the field you need, go back to `schema.ts` — see `add-feature`.

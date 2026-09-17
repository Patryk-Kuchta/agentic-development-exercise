---
name: learn-the-frontend
description: Translate React 19, Mantine and TanStack Query as used in apps/web from whatever UI you have built before — server-rendered templates, jQuery, Angular, Vue, mobile, or none. Use when writing or reviewing frontend code and React is new.
---

For developers who have built a UI before, just not this one. Only the differences that
bite. The language side is `learn-this-stack`.

## Start from what you know

| You have built with                | React will feel               | Unlearn first                                                  |
| ---------------------------------- | ----------------------------- | -------------------------------------------------------------- |
| Server-rendered templates          | inverted                      | The page is not re-rendered by the server; nothing is          |
| jQuery or hand-written DOM         | backwards                     | You never reach for an element. You describe the result        |
| A component framework with classes | familiar, minus the lifecycle | No instance, no fields, no lifecycle overrides to hang work on |
| Angular or Vue                     | close                         | No DI container, no two-way binding, no directives             |
| SwiftUI or Jetpack Compose         | immediately familiar          | Almost nothing — you already think in declarative re-render    |
| React without types                | identical, with a safety net  | Hand-written prop shapes and `fetch`. Both are generated here  |

Whatever the row, one sentence covers most of it: **you describe what the screen should
look like for the current state, and the framework works out the DOM operations.**

## Re-render is not re-instantiate

The single biggest shift. When state changes React **calls your function again**, top to
bottom. There is no long-lived instance whose fields you mutate.

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

- A `const` inside the component is recreated every render. That is fine and cheap.
- State survives between renders because `useState` stores it outside the function.
- Never mutate state — `movies.push(x)` changes nothing React can see. Produce a new
  value: `setMovies([...movies, x])`.
- You never tell React to redraw. Calling the setter _is_ the signal.

## JSX

It is JavaScript with markup literals, not markup with code escapes. If you have used a
template language, the direction is the opposite of what you are used to.

| You may know          | JSX                                            |
| --------------------- | ---------------------------------------------- |
| a loop directive      | `.map(...)` returning elements, with `key`     |
| a conditional block   | `{x ? <A /> : null}` or `{x && <A />}`         |
| `class=`              | `className=`                                   |
| `onclick="handler()"` | `onClick={handler}` — a function, not a string |
| the model object      | props — the function's argument                |

`key` on a mapped list is not decoration: it is how React matches elements across renders.

Props are **read-only**, always. A child never assigns to one. Data flows down; changes
flow back up as callbacks.

## `useEffect` is usually the wrong tool

It is not "run when the component loads". It is an escape hatch for synchronising with
something **outside** React.

| Want                                     | Use                                           |
| ---------------------------------------- | --------------------------------------------- |
| Server data                              | `useQuery` — never a fetch in `useEffect`     |
| A derived value                          | compute it during render; no state, no effect |
| To respond to a click                    | the event handler                             |
| To reset state when a prop changes       | a `key` on the component                      |
| To subscribe to a timer, socket, DOM API | `useEffect` — genuinely                       |

If you reach for `useEffect` to load data or to keep two pieces of state in sync, stop.

## Server state is a cache, not state

TanStack Query replaces the HTTP client, the cache and every `isLoading` boolean you would
otherwise write by hand.

```tsx
const { data, isPending, isError, error } = useQuery(orpc.stats.queryOptions());
```

- `isPending` / `isError` come free. Do not track loading in `useState`.
- After a write, `invalidateQueries` refetches. No manual refresh counter.
- Data fetched once is shared by every component asking for the same key.
- Treat it as a cache of the server's truth, never as your own copy to edit. Copying a
  response into `useState` gives you two truths, and one of them goes stale.

## Never hand-write a `fetch`

Data comes from the generated oRPC hooks, typed by `packages/contract/src/contract.ts`:

```ts
const orpc = createTanstackQueryUtils(client);
useQuery(orpc.stats.queryOptions());
```

A hand-written `fetch`, an axios call or a hand-declared response type is a second
definition of the contract, and it will drift from the first. If the hook lacks a field you
need, go back to `schema.ts` — see `add-feature`.

## Mantine

Mantine 9 is the component library: `Card`, `Stack`, `Group`, `Grid`, `Table`,
`Pagination`, `TextInput`, `Select`, `Modal`, notifications, theming, dark mode. Check
`use-the-library` before hand-rolling anything — a bespoke flex wrapper or a wrapped
`<input>` is a review failure.

Forms: `@mantine/form`'s `useForm` with `mantine-form-zod-resolver`, not `useState` per
field.

## Routing

react-router, client side. The server serves one HTML file; navigation swaps components
without a request. `useParams()` gives you **strings** — parse them. State someone might
share or bookmark — page number, search text, filters — belongs in the query string, not in
`useState`.

## Where to go next

| Next               | For                                            |
| ------------------ | ---------------------------------------------- |
| `learn-this-stack` | The language half: TypeScript, npm, async, Zod |
| `use-the-library`  | Before writing any helper or wrapper           |
| `code-style`       | Naming, components, tests                      |
| `debug-this-stack` | An empty page, a stale list, a type error      |

Faster than reading: ask the agent to translate a page you are working on into the
framework you already know, then argue with the answer.

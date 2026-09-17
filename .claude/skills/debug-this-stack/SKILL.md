---
name: debug-this-stack
description: Find the cause of a failure in this stack by symptom — migrations, types, drizzle-kit check, 404s, empty UI, lint failures, hanging tests. Use when something breaks and the error message is not enough.
---

Find your symptom. Take the fix.

## Boot and database

**`setReturnArrays is not a function` on every migration**
Wrong Node. `node:sqlite` on Node 23 lacks it.

```sh
nvm use   # Node 24, pinned in .nvmrc
```

Every shell, every time. `node -v` to confirm before debugging anything else.

**`drizzle-kit check` fails / "migrations don't match schema"**
You edited `schema.ts` without generating, or hand-edited a migration.

```sh
npm run db:generate   # then read the SQL and commit it with the schema change
```

Never hand-write migration SQL. Never edit an applied migration — add a new one.

**Database looks wrong or half-migrated**
Delete and rebuild. `rm apps/api/data/app.db`, then `npm run dev`. It is
gitignored and recreated at boot. See `ingest-data`.

## Types and lint

**A type error appeared after a schema change**
That is the system working. The error is the schema change propagating.

Follow it **upstream**, not downstream: fix `schema.ts`, regenerate, let
`zod.ts` and `contract.ts` update. Never patch the call site with `as`, `!`,
`any`, a widened type, or a loosened Zod field. If the types fight you, the
schema is wrong.

**`strict-boolean-expressions`**
Compare explicitly — `''` and `0` are falsy and mean real values here.

```ts
if (title !== '') ...        // not: if (title)
if (count > 0) ...           // not: if (count)
if (value !== undefined) ... // not: if (value)
const port = env.PORT ?? 3000; // ?? never ||
```

**`noUncheckedIndexedAccess`** — `arr[0]` is `T | undefined`, always, even after
a length check.

```ts
const first = items[0];
if (first === undefined) throw new Error(`Expected at least one item, got ${String(items.length)}`);
```

`items.at(0)` with the same check, or `for (const item of items)`, also work.
`items[0]!` does not — `!` is banned.

**Prettier failure** — `npm run format`. Never hand-format.

## HTTP

**404 from the API**
The contract's paths are relative; Express mounts the whole contract under
`/api`. A contract path of `/movies/{id}` is served at `/api/movies/{id}`.

Check, in order:

1. The path in `contract.ts` has no `/api` prefix (that would give `/api/api/...`).
2. The route is actually exported in the contract object and implemented in the router.
3. The web client's `OpenAPILink` url is `/api` (tests: `http://localhost:PORT/api`).
4. Method matches — a GET route called with POST is a 404, not a 405.

**The API answers but the web app 404s in dev** — the Vite proxy for `/api` is
not hitting the API port. Confirm the API is up on its port first.

## The web app

**No movies, or "no movies yet"**
Ingest never ran or failed. `npm run ingest`. Check `GET /api/stats` —
`isIngested: false` confirms it. Auto-ingest only fires when the table is empty
and `INGEST_ON_BOOT` is true; a failed auto-ingest logs loudly and leaves the
server serving. See `ingest-data`.

**Data is stale after a write** — you did not `invalidateQueries`. Do not add a
refresh counter or a `useEffect`.

**Something rendered twice in dev** — StrictMode double-invokes to surface
side-effect bugs. Not a bug; a signal that your render is not pure if it breaks.

## Tests

**A test hangs and vitest never exits**
A server that was never closed. Every test that boots the app on port 0 must
close it — `afterEach`/`afterAll`, or a helper that returns a teardown. An open
listener keeps the event loop alive forever.

Also check: an un-awaited promise, or a fetch to a port nothing is listening on.

**A test fails right after a contract change** — usually the test is now right
and the code is wrong. Read the assertion before touching the test.

**A test hit the network** — ingest tests must inject `fetchPage`. Never the real
HTTP fetcher.

## When none of this matches

Run the failing stage alone (`npm run typecheck`, `npm run lint`, `npm test`)
and read the first error, not the last. Then finish with `npm run check`. See
`verify`.

# apps/api

Express 5 serving the oRPC contract, Drizzle over Node's built-in `node:sqlite`, Vitest.

## There are no hand-written routes

The entire HTTP surface is `packages/contract`. `app.ts` mounts one `OpenAPIHandler` at
`/api`, so a procedure declaring `path: '/movies/{id}'` is answered at `/api/movies/{id}`,
with the contract's Zod schemas validating input before a handler runs.

Adding an endpoint means editing the contract, then implementing it in `router.ts`. It never
means touching `app.ts`.

```
contract.ts  ->  router.ts   handler types + runtime validation, both derived
                 movies.ts   the actual queries
```

Handlers stay thin. A handler that contains a query is a handler that cannot be tested
without HTTP.

## Layout

| File            | Holds                                                             |
| --------------- | ----------------------------------------------------------------- |
| `app.ts`        | builds the Express app without listening, so tests can use port 0 |
| `main.ts`       | the real entry point: migrate, listen, then ingest if empty       |
| `router.ts`     | the contract implementation                                       |
| `movies.ts`     | Drizzle queries over the `movies` table                           |
| `db.ts`         | `node:sqlite` + Drizzle, and the migrator                         |
| `env.ts`        | the only place `process.env` is read, parsed with Zod             |
| `paths.ts`      | paths resolved from the file, not the cwd                         |
| `embeddings.ts` | float32 BLOB encode/decode                                        |
| `ingest/`       | the Hugging Face dataset ingest                                   |

## Coming from ASP.NET?

- `env.ts` is `IOptions<T>` with validation, except a bad value crashes at boot instead of
  at first use. That is deliberate: see "fail loudly at the boundary" in the code-style skill.
- Drizzle is EF Core with the magic removed. There is no change tracker and no lazy loading;
  a query runs when you call `.all()` / `.get()`. What you write is what executes.
- There is no DI container. A handler that needs the database is passed `db`. That is why
  `createApp(db)` takes it as an argument — it is also what makes tests trivial.
- `node:sqlite` is synchronous. `db.select()...all()` returns rows, not a `Task`. This is
  fine: SQLite is a local file, and there is no network to await.

## Ingest

`npm run ingest`, or automatically at boot when the table is empty. It pages the Hugging
Face datasets-server rows API and upserts on `imdb_id`, which makes it idempotent and
collapses the dataset's 45 duplicate ids to land 1455 rows.

Auto-ingest starts **after** `listen`, and a failure logs loudly without killing the
process — a network blip must not stop `npm run dev` from serving. Details and env vars:
`.claude/skills/ingest-data/SKILL.md`.

## Embeddings

Stored as a BLOB of little-endian float32. `plotEmbedding` is declared
`blob('plot_embedding', { mode: 'buffer' })`, and the mode is load-bearing: Drizzle's
default blob mode is JSON, which would parse the bytes into an object and destroy the
vector. Decode with a `Float32Array` view over the buffer, narrowing with
`instanceof Uint8Array` — never `as`.

The embedding is omitted from `movieSchema`, so it can never reach the browser by accident.

## Testing

Boot the **real** app on port 0 and drive it through the typed oRPC client over genuine
HTTP — `test/helpers/server.ts` does this. No supertest, no mocked HTTP layer: a test
failure here is a failure a browser would also see.

Each test gets its own `:memory:` database, migrated by the same generated SQL production
runs. Ingest tests inject a fake page fetcher and **never** touch the network.

Close the server in every test that starts one. A leaked listener is the usual reason a
Vitest run hangs instead of exiting.

---
name: ingest-data
description: Understand and operate the Hugging Face movie ingest. Use when the database is empty, when re-running or limiting ingest, when resetting the local database, or when working with plot embeddings.
---

## The dataset

`MongoDB/embedded_movies`, read through the Hugging Face datasets-server rows
API — plain `fetch`, no parquet, no extra dependency, no API key.

```
https://datasets-server.huggingface.co/rows?dataset=MongoDB/embedded_movies&config=default&split=train&offset=0&length=100
```

Response: `{ num_rows_total, rows: [{ row_idx, row }] }`. **`length` is capped at
100** by the API, so ingest pages through 1500 rows in batches of 100.

Facts worth knowing:

| Fact                                               | Consequence                                              |
| -------------------------------------------------- | -------------------------------------------------------- |
| 1500 rows, 1455 distinct `imdb.id`                 | A clean ingest lands **1455 rows**, not 1500             |
| `imdb_id` is the natural key, ingest upserts on it | Re-running changes nothing — ingest is idempotent        |
| No release-year field exists                       | Do not invent one                                        |
| `imdb.rating` / `imdb.votes` can be `""`           | Parsed defensively into `null` with Zod, never with `as` |
| `plot_embedding` is 1536 floats, null on 28 rows   | Nullable BLOB column                                     |
| `type` is only `movie` or `series`                 | A `z.enum`, not a free string                            |

## Running it

```sh
npm run ingest                # whole dataset -> 1455 rows
npm run ingest -- --limit=50  # fast partial run while developing
```

The `--` passes the flag through npm to the script; without it npm eats the flag.

## Auto-ingest on boot

The API ingests automatically when the movies table is empty, kicked off **after**
`listen` so the server answers immediately. A failed auto-ingest logs a loud
error naming the remedy and leaves the server serving — the landing page then
shows an explicit "no movies yet" state rather than an empty grid.

| Env var             | Default                   | Does                              |
| ------------------- | ------------------------- | --------------------------------- |
| `INGEST_ON_BOOT`    | `true`                    | Ingest when the table is empty    |
| `INGEST_LIMIT`      | unset (all rows)          | Stop after roughly this many rows |
| `HF_DATASET`        | `MongoDB/embedded_movies` | Which dataset to read             |
| `HF_DATASET_CONFIG` | `default`                 | Dataset config                    |
| `HF_DATASET_SPLIT`  | `train`                   | Dataset split                     |
| `DATABASE_URL`      | `apps/api/data/app.db`    | SQLite file path                  |

All parsed by Zod in `apps/api/src/env.ts` at boot; malformed means a hard crash,
not a default. There is no dotenv — use `node --env-file=.env` if you want a file.

Those three `HF_*` vars are the only thing you change to point at a different
dataset — assuming it has the same columns, which is exactly what `schema.ts`
encodes.

## Starting over

```sh
rm apps/api/data/app.db   # gitignored; migrations recreate it on boot
npm run dev               # or npm run ingest
```

Nothing else is stateful. There is no server to restart, no volume to prune.

## The embeddings

`plotEmbedding` is `blob('plot_embedding', { mode: 'buffer' })` holding a
little-endian `Float32Array` — 1536 floats = 6 KiB per row, ~9 MB total. A third
the size of JSON text, and it decodes with zero parsing.

```ts
encodeEmbedding(values); // Buffer.from(new Uint8Array(Float32Array.from(values).buffer))
decodeEmbedding(bytes); // new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
```

Two traps:

- `blob('x')` **without** `mode: 'buffer'` defaults to JSON mode and hands back a
  parsed plain object, silently destroying the vector. Never remove the mode.
- `node:sqlite` returns `Uint8Array`; drizzle's buffer mode wraps it as `Buffer`.
  `bytes instanceof Uint8Array` narrows both — no `as` needed.

**The embedding never crosses the wire.** `movieSchema` is
`createSelectSchema(movies, ...).omit({ plotEmbedding: true })`, so no API
response ever carries 6 KiB of floats to the browser. Exercise 3 computes
similarity server-side and sends scores.

## Testing ingest

Inject a fake page-fetcher (`fetchPage`) — a test never hits the network. Each
test gets its own `:memory:` database, migrated by the same generated SQL.

---
name: start-here
description: Orient a new learner in this repo — what the app is, how to run it, and what the three exercises are. Use on first contact with the repo, or when unsure what to build, which branch holds an answer, or what "done" means.
---

**Movie Suggester.** A movie browser built from the Hugging Face dataset
`MongoDB/embedded_movies` — 1500 rows of title/plot/cast/genres plus a 1536-float
OpenAI plot embedding per row. Ingested once into local SQLite; no API key, no
service, no network after ingest.

You work through this repo **with an AI agent**. Your job is to direct and review
it, not to type every line. See `self-review`.

## The two rules

1. **Derive, never duplicate.** A field is declared once in
   `packages/contract/src/schema.ts`; Zod schemas, the oRPC contract, handler
   types, React hooks and the SQL migration are all generated from it.
2. **npm only, zero infrastructure.** `nvm use && npm install && npm run dev` from
   a fresh clone. No Docker, no daemon, no database server, no native build.

## Run it

```sh
nvm use          # Node 24. Not optional — see below.
npm install      # at the root; never inside a workspace
npm run dev      # api :3000 + web :5173, watch mode
npm run ingest   # load the dataset (boot auto-ingests too)
```

**Node 24 gotcha.** On Node 23 `node:sqlite` has no `setReturnArrays`, so every
drizzle migration throws at boot. If migrations explode, you skipped `nvm use`.

## The stack, in one table

| Workspace           | Is                                                                     |
| ------------------- | ---------------------------------------------------------------------- |
| `packages/contract` | Drizzle `sqliteTable` -> drizzle-zod -> oRPC contract. Source of truth |
| `apps/api`          | Express 5 + oRPC, Drizzle over `node:sqlite`, vitest                   |
| `apps/web`          | Vite + React 19 + Mantine 9 + TanStack Query 5 + react-router          |

New to TypeScript or React? Use `learn-this-stack`: say which language you normally
write, point at a file or ask a question, and get this repo explained in those terms.

## The exercises

| #   | Build                                                         | Example solution branch       |
| --- | ------------------------------------------------------------- | ----------------------------- |
| 1   | Paginated, searchable movie list + detail page                | `exercise-1-example-solution` |
| 2   | Sign-up/sign-in, favourites, favourites page and filter       | `exercise-2-example-solution` |
| 3   | Embedding similarity: "more like this" + personal suggestions | `exercise-3-example-solution` |

Briefs live in [README.md](../../../README.md#the-exercises). Each is solvable without reading
its branch. Read the brief, not the solution, first.

## Done means one thing

```sh
npm run check
```

typecheck -> eslint (`--max-warnings=0`) -> prettier -> vitest -> `drizzle-kit
check` -> web build. Green, or it is not done. See `verify`.

## Where to go next

| Doing                     | Read                    |
| ------------------------- | ----------------------- |
| Adding a route or entity  | `add-feature`           |
| Touching the schema       | `change-schema`         |
| Writing a helper          | `use-the-library`       |
| The dataset / ingest      | `ingest-data`           |
| Something broke           | `debug-this-stack`      |
| Claiming a change is done | `self-review`, `verify` |

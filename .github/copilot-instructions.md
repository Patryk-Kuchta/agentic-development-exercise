# Copilot instructions

Full instructions: [`AGENTS.md`](../AGENTS.md). The essentials are inlined below.

## Stack

npm-workspaces monorepo, Node 24 (`.nvmrc`). Three workspaces:
`packages/contract` (Drizzle schema, drizzle-zod, oRPC contract), `apps/api`
(Express 5, `@orpc/server` with `@orpc/openapi`, Drizzle over `node:sqlite`,
vitest), `apps/web` (Vite, React 19, Mantine, React Query,
`@orpc/tanstack-query`, react-router).

The app is **Movie Suggester**, over the `MongoDB/embedded_movies` Hugging Face
dataset. It is a teaching repo: `main` holds the foundation, and three exercises
in `exercises/` build the rest.

## Rule 1 — derive, never duplicate

```
Drizzle table -> Zod schema -> oRPC contract -> handler types + validation, React Query hooks, SQL migration
```

A field is declared once, in `packages/contract/src/schema.ts`. Everything else
is derived. Never hand-write a Zod schema, a TypeScript type, a SQL migration, or
a `fetch` call that duplicates something derivable. Work in that order: schema.ts
-> `npm run db:generate` -> zod.ts -> contract.ts -> api router -> test -> web.
Going backwards produces duplicate definitions that drift.

## Rule 2 — npm only, zero infrastructure

`nvm use && npm install && npm run dev` must work from a fresh clone. Never
suggest Docker, docker-compose, a container runtime, a daemon, a database server,
a cloud account, or a native build (no node-gyp). SQLite is Node's built-in
`node:sqlite` — never `better-sqlite3`. npm packages themselves are fine.

## Gate

`npm run check` — typecheck, `eslint --max-warnings=0`, prettier, vitest,
drizzle-kit check, web build. Must be green before committing.

## Banned

`any`; `as` assertions (parse with Zod instead); non-null `!`; floating promises;
truthiness checks on possibly-empty strings (compare explicitly); non-exhaustive
switches; default exports; `enum` and `namespace` (use `z.enum`). `arr[0]` is
`T | undefined` — narrow it, never `!`.

Before writing a helper, check Mantine, `@mantine/form`, React Query, Zod, and
Drizzle — they cover most of it.

Commits: single line, imperative, max 72 chars, no trailers.

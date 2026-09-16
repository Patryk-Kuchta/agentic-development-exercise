# Project

npm-workspaces monorepo, Node 24 (`.nvmrc`).

- `packages/contract` — Drizzle schema -> drizzle-zod -> ts-rest contract. Source of truth.
- `apps/api` — Express 5 + @ts-rest/express, Drizzle over `node:sqlite`, vitest.
- `apps/web` — Vite + React 19 + Mantine + React Query + @ts-rest/react-query.

## Derive, never duplicate

```
Drizzle table -> Zod schema -> ts-rest contract -> handler types + validation, React Query hooks, SQL migration
```

A field is declared once, in `packages/contract/src/schema.ts`. Everything else
is derived. Never hand-write a Zod schema, a type, a migration, or a fetch call
that duplicates something derivable. Work in that order; going backwards makes
duplicate definitions.

## npm only, zero infrastructure

`nvm use && npm install && npm run dev` must be enough from a fresh clone. No
Docker, container, daemon, database server, cloud account, or native build
(no node-gyp) — `node:sqlite`, never `better-sqlite3`. npm packages themselves
are fine.

## Gate

`npm run check` — typecheck, eslint (`--max-warnings=0`), prettier, vitest,
drizzle-kit check, web build. Must be green before committing.

No `any`, no `as`, no `!`, no default exports.

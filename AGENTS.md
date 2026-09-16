# AGENTS.md

Instructions for coding agents working in this repo. Humans should read this too.

## Project overview

`agentic-development-exercise` — an npm-workspaces monorepo. Three workspaces:

| Workspace           | What it is                                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contract` | **Source of truth.** Drizzle `sqliteTable` schema (`src/schema.ts`), drizzle-zod schemas derived from it (`src/zod.ts`), ts-rest contract built from those (`src/contract.ts`), re-exported from `src/index.ts`. |
| `apps/api`          | Express 5 + `@ts-rest/express` `createExpressEndpoints`. Drizzle ORM over Node's built-in `node:sqlite`. drizzle-kit migrations applied at boot. Env parsed with Zod.                                            |
| `apps/web`          | Vite + React 19 + Mantine + `@tanstack/react-query` + `@ts-rest/react-query` + react-router.                                                                                                                     |

## Rule 1 — derive, never duplicate

```
Drizzle table -> (drizzle-zod) -> Zod schema -> (ts-rest) -> contract
                                                              |-> Express handler types + runtime validation
                                                              |-> typed React Query hooks
                                                              `-> generated SQL migration
```

A field is declared **once**, in `packages/contract/src/schema.ts`. Everything else is derived.

- Never hand-write a Zod schema, a TypeScript type, a SQL migration, or a `fetch` call that duplicates something derivable.
- Work in that order. Going backwards — writing the handler first, the hook first, the type first — produces a second definition that drifts.
- If the types fight you, the schema is wrong. Fix the schema, not the call site.

## Rule 2 — npm only, zero infrastructure

A fresh clone reaches a running app with:

```sh
nvm use && npm install && npm run dev
```

Nothing may require Docker, a container runtime, a daemon, a database server, a cloud account, or a native compile (no node-gyp).

npm packages are fine and encouraged — the constraint is on **infrastructure**, not dependencies.

SQLite is used through Node's built-in `node:sqlite`. Specifically **not** `better-sqlite3`: it is a native addon.

### Never install anything requiring infrastructure

Before adding a dependency, ask: does it need a service, daemon, container, or native build?

- Banned: Docker / docker-compose / podman images, Postgres, MySQL, Redis, Elasticsearch, minikube, anything installed by `brew install` or `apt-get`.
- Banned: native addons — `better-sqlite3`, `bcrypt` (use `node:crypto` scrypt), `canvas`, `sharp`.
- Allowed: any pure-JS/WASM npm package.

If a task seems to need infrastructure, stop and ask the user. See `.claude/skills/add-dependency/SKILL.md`.

## Setup commands

```sh
nvm use          # Node 24 LTS, pinned in .nvmrc
npm install      # installs all workspaces
npm run dev      # api + web, watch mode
```

## Dev environment

- Node 24 LTS, pinned in `.nvmrc`. `node:sqlite` requires it.
- npm workspaces. Install at the root; never `npm install` inside a workspace.
- The API creates and migrates its SQLite file at boot. There is no database to start.
- API env is parsed with Zod at startup; a missing or malformed var is a hard crash, not a default.

| Command               | Does                                                |
| --------------------- | --------------------------------------------------- |
| `npm run dev`         | Run api + web in watch mode                         |
| `npm run check`       | **The gate.** Everything below, in order            |
| `npm run typecheck`   | `tsc --noEmit` per workspace                        |
| `npm run lint`        | `eslint --max-warnings=0`                           |
| `npm run format`      | Prettier write (`format:check` to verify)           |
| `npm test`            | `vitest run`                                        |
| `npm run db:generate` | drizzle-kit generate — new migration from schema.ts |
| `npm run db:check`    | drizzle-kit check — migrations match schema         |
| `npm run build`       | Web production build                                |

## Code style

Full conventions: `.claude/skills/code-style/SKILL.md`.

TypeScript config extends a copied `@tsconfig/strictest`, plus:

- `verbatimModuleSyntax` — `import type` for type-only imports.
- `erasableSyntaxOnly` — no `enum`, no `namespace`, no parameter properties. Use Zod unions instead of enums.
- `noUncheckedSideEffectImports`.

ESLint runs `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`. Banned:

- `any`.
- `as` assertions — `assertionStyle: never`. If a value's type is uncertain, put it through Zod.
- Non-null `!`.
- Floating promises.
- Truthiness checks on possibly-empty strings (`strict-boolean-expressions`) — compare explicitly.
- Non-exhaustive `switch`.
- Default exports. Named exports only.

Errors: fail loudly at the boundary. Parse at the edge with Zod; never guess a default to keep a path alive.

`noUncheckedIndexedAccess` is on: `arr[0]` is `T | undefined`. Narrow it. Do not reach for `!`.

## Testing

- `vitest` everywhere. `npm test` runs all workspaces.
- API tests boot the **real** app on port 0 and drive it with the generated ts-rest client. No supertest, no mocked HTTP layer.
- Each test gets its own SQLite file; migrations run at boot as in production.
- Test names describe behaviour: `returns 404 when the id is unknown`.
- A new route is not done without a test that calls it through the client.

## PR and commit conventions

- Commits: single line, imperative, max 72 chars, no body, no trailers. See `.claude/skills/git-commit-format/SKILL.md`.
- `npm run check` must be green before you commit. Never commit with it red.
- Generated migration SQL is committed alongside the schema change that produced it, in the same commit.
- Never edit an already-applied migration. Add a new one.
- Branch per change; CI runs `npm run check` on every push and PR.

## Skills

Agents that do not load `.claude/skills/` automatically should read these directly.

| Skill                                                                  | Read it when                           |
| ---------------------------------------------------------------------- | -------------------------------------- |
| [`add-feature`](.claude/skills/add-feature/SKILL.md)                   | Adding an entity or a route            |
| [`change-schema`](.claude/skills/change-schema/SKILL.md)               | Editing `schema.ts` or migrations      |
| [`use-the-library`](.claude/skills/use-the-library/SKILL.md)           | Before writing any helper or util      |
| [`verify`](.claude/skills/verify/SKILL.md)                             | Running the gate, reading its failures |
| [`add-dependency`](.claude/skills/add-dependency/SKILL.md)             | Adding an npm package                  |
| [`code-style`](.claude/skills/code-style/SKILL.md)                     | Writing or reviewing any code          |
| [`implementor-reviewer`](.claude/skills/implementor-reviewer/SKILL.md) | Working through an agreed plan         |
| [`grill-me`](.claude/skills/grill-me/SKILL.md)                         | Stress-testing a plan or design        |
| [`git-commit-format`](.claude/skills/git-commit-format/SKILL.md)       | Writing a commit message               |

# AGENTS.md

Instructions for coding agents working in this repo. Humans should read this too.

This is the only copy. `CLAUDE.md` imports it, and
`.github/copilot-instructions.md` and `.cursor/rules/project.mdc` are **symlinks** to it —
edit this file, never those.

## What this is

**Movie Suggester** — a small app over the
[`MongoDB/embedded_movies`](https://huggingface.co/datasets/MongoDB/embedded_movies)
Hugging Face dataset: 1500 films with plots, cast, ratings, and a 1536-number
`plot_embedding` per film.

It is also a **teaching repo**. `main` deliberately ships only the foundation — the schema,
the dataset ingest, a health/stats API and a landing page. Three exercises build the rest,
each with a worked answer on its own branch:

| Exercise                     | Builds                               | Example solution branch       |
| ---------------------------- | ------------------------------------ | ----------------------------- |
| [1](exercises/EXERCISE-1.md) | Paginated movie list + detail page   | `exercise-1-example-solution` |
| [2](exercises/EXERCISE-2.md) | Accounts and favourites              | `exercise-2-example-solution` |
| [3](exercises/EXERCISE-3.md) | Suggestions from the plot embeddings | `exercise-3-example-solution` |

If you are an agent asked to "do exercise N", build it on a branch off the previous one;
do not copy the example solution.

## Project overview

`agentic-development-exercise` — an npm-workspaces monorepo. Three workspaces:

| Workspace           | What it is                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contract` | **Source of truth.** Drizzle `sqliteTable` schema (`src/schema.ts`), drizzle-zod schemas derived from it (`src/zod.ts`), oRPC contract built from those (`src/contract.ts`), re-exported from `src/index.ts`. |
| `apps/api`          | Express 5 serving the contract through `@orpc/server` + `@orpc/openapi`. Drizzle ORM over Node's built-in `node:sqlite`. drizzle-kit migrations applied at boot. Env parsed with Zod.                         |
| `apps/web`          | Vite + React 19 + Mantine + `@tanstack/react-query` + `@orpc/tanstack-query` + react-router.                                                                                                                  |

## Rule 1 — derive, never duplicate

```
Drizzle table -> (drizzle-zod) -> Zod schema -> (oRPC) -> contract
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

- Node 24 LTS, pinned in `.nvmrc`. **`nvm use` is not optional**: on Node 23 and below,
  `node:sqlite` has no `Statement.setReturnArrays`, and every drizzle migration throws
  `stmt.setReturnArrays is not a function`. That error means the wrong Node, nothing else.
- npm workspaces. Install at the root; never `npm install` inside a workspace.
- The API creates and migrates its SQLite file at boot. There is no database to start.
- The API also ingests the dataset at boot when the table is empty, so a fresh clone reaches
  a populated app from `npm run dev` alone. Set `INGEST_ON_BOOT=false` to stop it.
- API env is parsed with Zod at startup; a missing or malformed var is a hard crash, not a default.

| Command               | Does                                                |
| --------------------- | --------------------------------------------------- |
| `npm run dev`         | Run api + web in watch mode                         |
| `npm run ingest`      | Download and upsert the dataset (`-- --limit=50`)   |
| `npm run check`       | **The gate.** Everything below, in order            |
| `npm run typecheck`   | `tsc --noEmit` per workspace                        |
| `npm run lint`        | `eslint --max-warnings=0`                           |
| `npm run format`      | Prettier write (`format:check` to verify)           |
| `npm test`            | `vitest run`                                        |
| `npm run db:generate` | drizzle-kit generate — new migration from schema.ts |
| `npm run db:check`    | drizzle-kit check — migrations match schema         |
| `npm run db:studio`   | drizzle-kit studio — browse the local SQLite file   |
| `npm run build`       | Web production build                                |

`npm run lint:fix` and `npm run format` fix in place. A husky `pre-commit` hook runs
lint-staged (eslint `--fix` + prettier) on staged files; it is not a substitute for
`npm run check`.

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
- API tests boot the **real** app on port 0 and drive it with the typed oRPC client. No supertest, no mocked HTTP layer.
- Each test gets its own SQLite file; migrations run at boot as in production.
- Test names describe behaviour: `returns 404 when the id is unknown`.
- A new route is not done without a test that calls it through the client.

## PR and commit conventions

- Commits: single line, imperative, max 72 chars, no body, no trailers. See `.claude/skills/git-commit-format/SKILL.md`.
- `npm run check` must be green before you commit. Never commit with it red — the
  husky pre-commit hook only lints staged files.
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

Learning the stack rather than shipping to it:

| Skill                                                                          | Read it when                               |
| ------------------------------------------------------------------------------ | ------------------------------------------ |
| [`start-here`](.claude/skills/start-here/SKILL.md)                             | First contact with this repo               |
| [`js-for-csharp-devs`](.claude/skills/js-for-csharp-devs/SKILL.md)             | Coming from C#/.NET to TypeScript          |
| [`frontend-for-csharp-devs`](.claude/skills/frontend-for-csharp-devs/SKILL.md) | Coming from Blazor/Razor to React          |
| [`self-review`](.claude/skills/self-review/SKILL.md)                           | Before calling any change done             |
| [`ingest-data`](.claude/skills/ingest-data/SKILL.md)                           | Operating or re-running the dataset ingest |
| [`debug-this-stack`](.claude/skills/debug-this-stack/SKILL.md)                 | Something broke and you want the fix       |

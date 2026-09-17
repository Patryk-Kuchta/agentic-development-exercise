# Movie Suggester

A small, deliberately strict TypeScript monorepo — React + Express + SQLite — built over
the [`MongoDB/embedded_movies`](https://huggingface.co/datasets/MongoDB/embedded_movies)
Hugging Face dataset: 1500 films with plots, cast, ratings, and a 1536-number
`plot_embedding` for each one.

It is a **teaching repo**. `main` ships the foundation and nothing else. You build the app.

```sh
nvm use          # Node 24, pinned in .nvmrc — not optional, see below
npm install
npm run dev      # api on :3000, web on :5173
```

The API downloads and ingests the dataset the first time it starts with an empty database,
so that is all you need. To do it by hand, or to redo it: `npm run ingest`.

## The exercises

Each one is a written brief you can hand to a coding agent, and each has a worked answer on
its own branch. Read the brief, not the branch.

| #                            | Build                                                  | Example solution              |
| ---------------------------- | ------------------------------------------------------ | ----------------------------- |
| [1](exercises/EXERCISE-1.md) | A paginated movie list and a detail page per film      | `exercise-1-example-solution` |
| [2](exercises/EXERCISE-2.md) | Sign-up, sign-in, and favourites that survive a reload | `exercise-2-example-solution` |
| [3](exercises/EXERCISE-3.md) | "Because you liked…", using the plot embeddings        | `exercise-3-example-solution` |

Exercise 2 builds on 1, and 3 on 2. New here? Start with the `start-here` skill in
`.claude/skills/`.

## The two rules

### 1. Derive, don't duplicate

```
packages/contract/src/schema.ts     <- the ONLY hand-written declaration
        |
        |  drizzle-zod
        v
    Zod schemas  ---------> oRPC contract ---> Express handler types
        |                                  \-> typed React Query hooks
        |  drizzle-kit generate
        v
    SQL migration
```

Never hand-write a type, a Zod schema, a migration or a `fetch` call that could be derived.
Adding a column and forgetting to validate it should not be a mistake you are able to make.

### 2. npm only, zero infrastructure

A fresh clone reaches a running app with nothing but Node and npm. No Docker, no container
runtime, no database server, no daemon, no cloud account, no API key, and no native
compile. SQLite comes from Node's own built-in `node:sqlite` — specifically **not**
`better-sqlite3`, which is a native addon. Passwords hash with `node:crypto` scrypt, not
`bcrypt`. Even the movie suggestions in Exercise 3 are computed locally, over embeddings
that shipped with the dataset.

npm packages themselves are welcome. The constraint is on infrastructure.

## Commands

| Command               | Does                                          |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | API and web together, both watching           |
| `npm run ingest`      | Download and upsert the dataset               |
| `npm run check`       | **The gate.** Everything below, in one line   |
| `npm run typecheck`   | `tsc --noEmit` across all three workspaces    |
| `npm run lint`        | ESLint, type-aware, zero warnings tolerated   |
| `npm run format`      | Prettier write (`format:check` to verify)     |
| `npm test`            | Vitest across all workspaces                  |
| `npm run db:generate` | Generate a migration after editing the schema |
| `npm run db:check`    | Verify schema and committed migrations agree  |
| `npm run db:studio`   | Browse the database in a GUI                  |

`npm run check` is the only definition of "done". CI runs the same line.

`npm run ingest -- --limit=50` ingests a slice, which is much faster while you are working.

## Node 24 is not optional

`node:sqlite` only grew `Statement.setReturnArrays` in Node 24, and Drizzle's migrator calls
it. On anything older, every migration dies with:

```
TypeError: stmt.setReturnArrays is not a function
```

That error always means the wrong Node. `nvm use` fixes it.

## Layout

```
packages/contract   the source of truth: Drizzle schema, derived Zod schemas, oRPC contract
apps/api            Express 5, Drizzle over node:sqlite, dataset ingest, migrations on boot
apps/web            Vite, React 19, Mantine, React Query
exercises/          the three briefs
.claude/            skills, subagents and hooks for Claude Code
AGENTS.md           the same instructions, for every other agent
```

Each workspace has its own `CLAUDE.md` explaining what lives there and why.

## Strictness

`tsconfig.base.json` is `@tsconfig/strictest` copied in (not installed) plus
`verbatimModuleSyntax`, `erasableSyntaxOnly` and `noUncheckedSideEffectImports`.
On top of typescript-eslint's `strictTypeChecked`, these are banned outright:
`any`, **all** type assertions (`as`), non-null assertions (`!`), floating promises,
truthiness checks on strings and numbers, non-exhaustive switches, default exports, and
`enum`.

If a value's type is uncertain, it goes through Zod. That is always available, so an
assertion is never the answer. The strictness is the teaching tool: a type error here is
usually the design telling you something true.

## Working on this with an AI agent

That is the point of the repo. `AGENTS.md` is the single source; `CLAUDE.md`,
`.cursor/rules/`, `.github/copilot-instructions.md` and `.vscode/` all point at it. Claude
Code additionally gets a set of skills — workflow ones like `add-feature` and
`change-schema`, and learning ones like `js-for-csharp-devs`, `frontend-for-csharp-devs`
and `self-review` — plus review subagents and a `PreToolUse` hook that refuses any command
which would introduce infrastructure.

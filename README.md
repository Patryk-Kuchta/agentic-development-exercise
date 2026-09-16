# agentic-development-exercise

A deliberately strict TypeScript monorepo: React + Express + SQLite, where a
field is declared **once** and everything else is derived from it.

Two rules govern the whole repo. They are stated in full in [AGENTS.md](AGENTS.md),
which is what every AI coding agent reads.

## 1. Derive, don't duplicate

```
packages/contract/src/schema.ts     <- the ONLY hand-written declaration
        |
        |  drizzle-orm/zod
        v
    Zod schemas  ---------> API contract ---> Express handler types
        |                                 \-> typed React Query hooks
        |  drizzle-kit generate
        v
    SQL migration
```

Never hand-write a type, a Zod schema, a migration or a fetch call that could
be derived. Adding a column and forgetting to validate it should not be a
mistake you are able to make.

## 2. npm only, zero infrastructure

A fresh clone reaches a running app with nothing but Node and npm:

```sh
nvm use          # Node 24, pinned in .nvmrc
npm install
npm run dev
```

No Docker, no container runtime, no database server, no daemon, no cloud
account, and no native compile. SQLite comes from Node's own built-in
`node:sqlite` — specifically **not** `better-sqlite3`, which is a native addon.
npm packages themselves are welcome; the constraint is on infrastructure.

## Commands

| Command               | Does                                          |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | API and web together, both watching           |
| `npm run check`       | **The gate.** Everything below, in one line   |
| `npm run typecheck`   | `tsc --noEmit` across all three workspaces    |
| `npm run lint`        | ESLint, type-aware, zero warnings tolerated   |
| `npm run format`      | Prettier write (`format:check` to verify)     |
| `npm test`            | Vitest across all workspaces                  |
| `npm run db:generate` | Generate a migration after editing the schema |
| `npm run db:check`    | Verify schema and committed migrations agree  |
| `npm run db:studio`   | Browse the database in a GUI                  |

`npm run check` is the only definition of "done". CI runs the same line, and so
does the optional `gate-on-stop` hook.

## Layout

```
packages/contract   the source of truth: Drizzle schema, derived Zod schemas
apps/api            Express 5, Drizzle over node:sqlite, migrations on boot
apps/web            Vite, React 19, Mantine, React Query
.claude/            skills, subagents and hooks for Claude Code
AGENTS.md           the same instructions, for every other agent
```

## Strictness

`tsconfig.base.json` is `@tsconfig/strictest` copied in (not installed) plus
`verbatimModuleSyntax`, `erasableSyntaxOnly` and `noUncheckedSideEffectImports`.
On top of typescript-eslint's `strictTypeChecked`, these are banned outright:
`any`, **all** type assertions (`as`), non-null assertions (`!`), floating
promises, truthiness checks on strings and numbers, non-exhaustive switches,
default exports, and `enum`.

If a value's type is uncertain, it goes through Zod. That is always available,
so an assertion is never the answer.

## Working on this with an AI agent

`AGENTS.md` is the single source; `CLAUDE.md`, `.cursor/rules/`,
`.github/copilot-instructions.md` and `.vscode/` all point at it. Claude Code
additionally gets nine skills, three review subagents, and a `PreToolUse` hook
that refuses any command which would introduce infrastructure.

## Status

Working and gated: the contract chain, the database layer with generated
migrations, the Express server, the web shell, and 12 tests.

Not yet wired: the HTTP routes binding the contract to the handlers, and the
web app's real data fetching (`TasksPage` currently renders clearly-marked
placeholder rows). The library that binds them is still being chosen — see the
note at the top of `AGENTS.md`.

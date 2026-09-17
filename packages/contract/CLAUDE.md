# packages/contract

The source of truth. Everything else in the repo is downstream of this folder.

## The four files, in dependency order

| File          | Declares                      | Built from                                          |
| ------------- | ----------------------------- | --------------------------------------------------- |
| `schema.ts`   | the `movies` table            | nothing — this is the only hand-written declaration |
| `zod.ts`      | `movieSchema`, `Movie`        | `schema.ts`, via drizzle-zod                        |
| `contract.ts` | the HTTP procedures           | `zod.ts`, via oRPC                                  |
| `index.ts`    | what the other workspaces see | the three above                                     |

Read them in that order and the design explains itself. Write them in that order too — "Rule
1 — derive, never duplicate" in [AGENTS.md](../../AGENTS.md) is the procedure.

## If this pipeline is new to you

Whatever you normally write, something in it plays the part of `schema.ts` — an ORM entity,
a model class, a struct with tags. The difference is that this one also generates the
migration, the validation, the DTOs **and** the client. There is no separate DTO layer
because there is nothing for a DTO to add.

`contract.ts` is closest to a shared interface in a class library referenced by both the
server and the client — the difference is that the Zod schemas in it are real objects at
runtime, so the same declaration also does the validating. Types vanish when TypeScript
compiles; Zod schemas do not. That is the whole reason this repo parses at every boundary
instead of trusting a cast.

## Rules specific to this folder

- **A field is declared once, here.** If you are typing a field name into a second file,
  stop.
- Change `schema.ts` -> run `npm run db:generate` -> commit the SQL in the same commit.
  Never hand-write migration SQL; never edit a migration that has been applied.
- `zod.ts` **refines** derived schemas (`.pick()`, `.omit()`, `.extend()`, or drizzle-zod's
  refinement argument). It never declares a fresh `z.object` that restates a column.
- Adding a procedure to `contract.ts` is what gives the API its handler types and the web
  app its React Query hook. Both are generated. Neither is written by hand.

## Two traps this schema already fell into

1. **`blob('x')` defaults to JSON mode.** A blob column declared without
   `{ mode: 'buffer' }` hands back a parsed plain object and silently destroys binary data.
   `plotEmbedding` uses buffer mode, and must keep it.
2. **A `mode: 'json'` column derives a Zod schema that accepts anything** — `genres` would
   happily validate `[1, 2, 3]`. The six array columns are refined in `zod.ts` with
   `z.array(z.string())` for that reason. Refining a derived schema is allowed; declaring a
   parallel one is not.

## What is declared before it is used

This file first appears on `exercise-2-setup`, so check the branch before believing a claim
about what is wired up. On `main`, `movieSchema` is exported and unused by design — exercise 1
is what consumes it, in the movie list and detail routes.

The `users` and `favourites` tables are declared, migrated and exported up front for the same
reason. On `exercise-2-setup` nothing reads `favourites` yet: exercise 2 is about accounts, not
about drizzle-kit, so the schema work is already done for the learner. From
`exercise-2-solution` on, it is wired up. Sessions are deliberately absent, and belong in
memory in the API process.

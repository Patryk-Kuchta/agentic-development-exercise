---
name: change-schema
description: Change the Drizzle schema and generate the migration safely. Use when adding, renaming, or removing a column or table, or when touching anything in packages/contract or drizzle migrations.
---

1. Edit `packages/contract/src/schema.ts`.
2. `npm run db:generate`.
3. Read the generated SQL. It is a real artefact — check it does what you meant.
4. Commit the SQL with the schema change, same commit.
5. `npm run check` (runs `drizzle-kit check`, which catches drift).

## Never edit an applied migration

A migration that has been applied anywhere is frozen. Editing it silently
desyncs every database that already ran it. To fix a bad migration, write a new
one.

Never hand-write migration SQL either — change the schema and generate.

## The derived files update themselves

`zod.ts` and `contract.ts` are built _from_ the schema. After a schema change you
normally touch neither.

Your job on a schema change is mostly to **stop yourself writing** things:

- Do not add a Zod field to mirror a new column — drizzle-zod already has it.
- Do not write an `interface` or `type` for the row — infer it from the schema
  or the contract.
- Do not write SQL by hand.
- Do not "fix" a new type error downstream with `as` or `!`. That error is the
  schema change working correctly; follow it and update the call site.

Only edit `zod.ts` when the _API shape_ genuinely differs from the _table shape_
— an omitted id, a request-only field. Express that as a refinement of the
derived schema, never as a fresh `z.object`.

## Renames

A rename is a drop plus an add unless you tell drizzle-kit otherwise. Check the
generated SQL before committing; drizzle-kit prompts on ambiguity.

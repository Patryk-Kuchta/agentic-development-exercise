---
name: add-feature
description: Add a new entity or route across contract, api, and web in the required order. Use when adding a table, an endpoint, a page, or any feature that touches more than one workspace.
---

Work in this order. Each step consumes the output of the previous one.

1. **`packages/contract/src/schema.ts`** — declare the fields on the Drizzle
   `sqliteTable`. This is the only place a field is defined.
2. **`npm run db:generate`** — drizzle-kit writes the migration SQL. Read it.
   Commit it with the schema change.
3. **`packages/contract/src/zod.ts`** — derive with drizzle-zod
   (`createInsertSchema` / `createSelectSchema`). Refine here — `.omit()`,
   `.extend()` for request-only fields. Do not restate a column.
4. **`packages/contract/src/contract.ts`** — add the procedure to the oRPC
   contract from those Zod schemas: `oc.route({ method, path })` plus
   `.input()`, `.output()` and any `.errors()`. Export from `src/index.ts`.
5. **`apps/api`** — implement the handler in the router. Its argument and return
   types come from the contract; TypeScript tells you the shape. Query with
   Drizzle.
6. **`apps/api` vitest test** — boot the real app on port 0, call the new route
   through the typed oRPC client. Cover the success path and the failure
   the contract declares.
7. **`apps/web`** — consume the generated `@orpc/tanstack-query` hook. Add the
   route/page. Mantine for UI, `@mantine/form` for form state.

Then `npm run check`.

## Why the order is non-negotiable

Each step's types are produced by the previous step. Start in the middle and you
hand-write the thing that was about to be generated, and now there are two
definitions that drift.

- Handler before contract -> hand-written request/response types.
- Contract before schema -> a Zod schema that isn't the table.
- Web before contract -> a hand-rolled `fetch` and a duplicated response type.

If step 5 or 7 needs a field that isn't there, go back to step 1. Never patch it
in downstream.

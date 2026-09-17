---
name: verify
description: Run the gate and interpret its failures. Use before committing, when npm run check fails, or when a type or lint error is blocking progress.
---

```sh
npm run check
```

Runs, in order: `tsc --noEmit` per workspace -> `eslint --max-warnings=0` ->
`prettier --check` -> `vitest run` -> `drizzle-kit check` -> web production
build. Green before you commit. Never commit red.

To iterate faster, run the one stage that failed (`npm run typecheck`,
`npm run lint`, `npm test`), but finish with the full `npm run check`.

## Failure classes

**tsc** — real. Fix the code, not the type.

**eslint** — `--max-warnings=0`, so a warning is a failure. Never add
`eslint-disable`; if you think you need one, ask the user.

**prettier** — `npm run format`. Never hand-format.

**vitest** — read the assertion, not just the name. A failure after a contract
change usually means the test is now right and the code is wrong.

**drizzle-kit check** — migrations don't match `schema.ts`. You edited the
schema without `npm run db:generate`, or hand-edited a migration. See
`change-schema`.

**web build** — usually an import that typechecks but doesn't resolve, or a
server-only import pulled into client code.

## The two that get fixed wrong

### `noUncheckedIndexedAccess`

`arr[0]` has type `T | undefined`. Always. Even after `arr.length > 0`.

```ts
const first = items[0];
if (first === undefined) throw new Error(`Expected at least one item, got ${String(items.length)}`);
use(first);
```

Also fine: `items.at(0)` with the same narrowing, `for (const item of items)`,
destructuring with a checked default. Not fine: `items[0]!`.

### `strict-boolean-expressions`

Compare explicitly. A possibly-empty string or a possibly-zero number must not
be used as a condition.

```ts
if (name !== "") ...        // not: if (name)
if (count > 0) ...          // not: if (count)
if (value !== undefined) ...// not: if (value)
if (list.length > 0) ...    // not: if (list.length)
```

`??` for defaults, never `||` — `||` swallows `""` and `0`.

## Forbidden fixes

Never silence a type error with:

- `as` — `assertionStyle: never`. Uncertain type? Run it through Zod and handle
  the parse failure.
- `!` — narrow instead, or throw with a message.
- `any` / `@ts-expect-error` / `eslint-disable`.

A type error is information. Suppressing it moves the failure to runtime, in
production, without a message. If you cannot fix it honestly, stop and ask.

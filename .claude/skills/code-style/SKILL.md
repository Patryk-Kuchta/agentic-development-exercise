---
name: code-style
description: Apply this project's code style and naming conventions. Use before writing or reviewing code, or when deciding on formatting, naming, or file layout.
---

Apply these conventions when writing or reviewing code in this project.

## Codebase Structure

- `packages/contract/src` — `schema.ts` (Drizzle tables) -> `zod.ts` (drizzle-zod)
  -> `contract.ts` (ts-rest), re-exported from `index.ts`. Nothing else lives here.
- `apps/api/src` — routers, Drizzle db setup, Zod-parsed env. Handlers stay thin;
  logic goes in a plain function the handler calls.
- `apps/web/src` — routes/, components/, hooks/. Components render; data comes
  from `@ts-rest/react-query` hooks.
- Not all code will be in this structure, especially early code, but new code
  should always follow it.

## Derive, don't duplicate

- A field is declared once, in `schema.ts`. Types, Zod schemas, migrations, and
  client calls are derived. See `add-feature`.
- Never hand-write what the toolchain generates.
- A downstream type error after a schema change is the system working. Follow it
  upstream; do not patch the call site.

## Naming

- Functions are verbs (`parseConfig`), values are nouns (`config`).
- Booleans read as a predicate: `isReady`, `hasChanges`, `shouldRetry`.
- No abbreviations except widely understood ones (`id`, `url`, `db`).
- Match the surrounding file. A consistent-but-imperfect name beats a lone correct one.

## Exports

- Named exports only. No default exports — including React components and route
  modules.
- Export what is used elsewhere. Anything else stays module-private.

## Functions

- One reason to exist. If the name needs "and", split it.
- Return early instead of nesting. Guard clauses at the top.
- No sentinel or magic values as parameters — no `-1`, `""`, or `null` standing in
  for a missing concept. If a case has no natural value, it needs its own
  parameter, overload, or type.

## Types

- No `any`. No `as` — `assertionStyle: never`. Uncertain type? Zod `.parse` it.
- No non-null `!`. Narrow, or throw with a message.
- No `enum`, no `namespace` (`erasableSyntaxOnly` forbids them) — use
  `z.enum([...])` and infer the union.
- `import type` for type-only imports (`verbatimModuleSyntax`).
- `arr[0]` is `T | undefined` (`noUncheckedIndexedAccess`). Narrow it.
- Compare explicitly; never lean on truthiness (`strict-boolean-expressions`).
  `??`, never `||`, for defaults.

## Errors

- Fail loudly at the boundary; do not swallow exceptions to keep a path alive.
- Error messages state what was expected and what was found.
- Parse untrusted input — env, request bodies, JSON, params — with Zod at the
  edge. Inside the boundary, types are trusted.

## Comments

- Explain _why_, never _what_ — the code already says what.
- Delete commented-out code. Git remembers it.
- A comment that restates what the function does is noise.

## Tests

- Test names describe the behaviour, not the method: `returns empty list when no matches`.
- One assertion concept per test.
- No shared mutable fixtures between tests.
- API tests boot the real app on port 0 and call it through the generated
  ts-rest client. No supertest, no mocking the HTTP layer.

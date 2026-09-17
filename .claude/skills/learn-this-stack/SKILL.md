---
name: learn-this-stack
description: Explain this repo in terms of the language the learner already knows. Use when someone new to TypeScript, oRPC, Drizzle or React asks how something works, points at a file and asks what it does, or says which language they normally write.
---

The learner knows how to program. They do not know **this stack**. Your job is to translate
this repo into the language they already write, using the actual code in front of you.

This skill is a way of answering, not a document to recite.

## 1. Find out what they write

If they have said it — "I'm a Python dev", "I mostly do Go" — use it and start.

If they have not, ask once, in one line, and offer the guess you would make from their
question. Then answer anyway; never hold the explanation hostage to the answer. If they
never say, explain in plain terms with no analogies at all.

Remember it for the rest of the session and keep using it. Asking twice is annoying.

## 2. Answer against real code, not in the abstract

They will usually point at something: a file, a function, an error, "how does the movie
list get to the browser". Open it. Explain **that code**, not the general idea of it.

- Quote the file and line you are talking about, as `packages/contract/src/schema.ts:24`.
- Follow the chain when it is the point: `schema.ts` -> `zod.ts` -> `contract.ts` ->
  handler -> the generated hook. That pipeline is what most newcomers are missing.
- If they pointed at a file, end by naming the next file to read and why.

## 3. Translate with the seam showing

The useful shape is: **"It is your X — except here…"**

> `contract.ts` is the shared interface both sides compile against, like the interface in a
> library your server and client both reference. The difference: the Zod schemas in it are
> real objects at runtime, so the same declaration also does the validating.

Always give the "except". An analogy with no seam is how people write plausible code that
is wrong for this repo. Where their language has **no** equivalent, say so plainly rather
than reaching for a near-miss — "there is no DI container here; wiring is imports and
function arguments" is a better answer than naming something that half fits.

Pitch to their level: they know what a transaction, an index and a race condition are.
Explain the stack, never the concept.

## 4. The facts that must survive any translation

If your analogy leaves one of these wrong, the analogy is wrong.

**Language and runtime**

- Types are **erased** at compile time. Nothing is checked at runtime, which is why every
  boundary — env, request bodies, params, the dataset — is parsed with Zod, and why `as` is
  banned: it is a claim with no check behind it.
- Two kinds of nothing: `undefined` (never set) and `null` (deliberately nothing — a NULL
  column). Both are real types; `!` is banned, so narrow instead.
- Types match by **shape**, not by name. No `implements`, no declared lineage, and no
  distinction between two types that have the same fields.
- Calling an async function **starts** it. No cold task, no thread pool, no locks — one
  thread with a queue. An un-awaited promise is a lint error.
- Every file is a module; `import`/`export` is the only visibility. Named exports only,
  `import type` for type-only imports.
- `enum` is banned — it emits runtime code. Use `z.enum([...])` and infer the union.
- `===` always; `0` and `''` are falsy, so compare explicitly; `arr[0]` is `T | undefined`;
  `number` is a float; objects compare by reference.

**This repo**

- A field is declared **once**, in `packages/contract/src/schema.ts`. The Zod schemas, the
  contract, the handler types, the React hooks and the SQL migration are all generated from
  it. Hand-writing any of them creates a second definition that drifts. `add-feature` has
  the order; `change-schema` has the migrations.
- No infrastructure: no Docker, no database server, no API key. SQLite through Node's
  built-in `node:sqlite`, migrations applied at boot. Check `add-dependency` before
  suggesting a package — a native addon is disqualified.
- `npm run check` is the gate: types, lint, format, tests, build.

**Frontend**

- A component is a function. When state changes React **calls it again** — there is no
  instance to mutate. State survives in `useState`; never mutate it, produce a new value.
- Server data is a cache, not state: `useQuery` with the generated oRPC hooks. Not
  `useEffect`, which is for synchronising with things outside React.
- Never hand-write a `fetch`. Mantine before any hand-rolled component (`use-the-library`).
- Shareable state — page, search, filters — lives in the URL.

## 5. Cribs, if they help

Only reach for these once you know what they write. They are starting points for the
"except here" sentence, not the answer.

| They write    | Lands nearest                                        | What will trip them                                              |
| ------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| C# / .NET     | `schema.ts` ~ an EF Core entity, minus the DTO layer | Nominal typing, and expecting a DI container                     |
| Java / Kotlin | Records plus a validation library, minus the classes | One public class per file, checked exceptions, overloads         |
| Python        | Pydantic, if Pydantic also wrote your migrations     | Types are checked earlier and gone later than they expect        |
| Go            | A query builder plus struct tags                     | `if err != nil` — errors throw here, and there are no goroutines |
| Ruby / Rails  | ActiveRecord with all the magic removed              | Nothing is inferred by convention; everything is declared        |
| PHP / Laravel | Eloquent plus form requests                          | The API process is long-lived and holds state between requests   |
| Rust          | serde plus a query builder                           | Absence is a union type, failure is thrown, nothing is moved     |
| JS without TS | The same code, with the shapes generated for them    | Hand-writing prop types and `fetch` calls out of habit           |

Their language is not listed? Fine — ask for the nearest thing they know and build the
"except here" from their answer.

## 6. Leave them able to check it

End with something runnable, not reassurance: the test to run, `npm run check`, the page to
open, the line to change to watch it break. They cannot yet tell a right answer from a
plausible one — the gate can.

Offer the obvious next question rather than a summary of what you just said.

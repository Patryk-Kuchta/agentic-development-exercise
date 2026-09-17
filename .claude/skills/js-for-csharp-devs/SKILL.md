---
name: js-for-csharp-devs
description: Translate C#/.NET concepts into the TypeScript, ESM and npm used here. Use when coming from C# and unsure about modules, structural typing, null vs undefined, promises, or why enum and as are banned.
---

For experienced devs new to TypeScript. Only the differences that bite.

## The map

| C# / .NET          | Here                             | Where it breaks down                                                        |
| ------------------ | -------------------------------- | --------------------------------------------------------------------------- |
| NuGet + `.csproj`  | npm + `package.json`             | Deps are per-workspace, but installed once at the root into `node_modules/` |
| Assembly + `using` | ESM file + `import`/`export`     | Every **file** is a module; there is no assembly and no `internal`          |
| `Task<T>`          | `Promise<T>`                     | A promise is **already running**. There is no cold task, no `Start()`       |
| `await`            | `await`                          | Same shape. No `ConfigureAwait`, no sync context, single-threaded           |
| LINQ               | `map`/`filter`/`reduce`/`find`   | Eager, not lazy. No deferred execution, no `IQueryable` translation         |
| FluentValidation   | Zod                              | Zod also **produces the type** — validation and type are one declaration    |
| EF Core            | Drizzle                          | No change tracker, no lazy loading. Queries are explicit SQL builders       |
| xUnit              | Vitest                           | `describe`/`it`/`expect`. No `[Fact]`, no DI container                      |
| `enum`             | `z.enum([...])` + inferred union | TS `enum` is **banned** here — see below                                    |

## The big one: structural typing

C# is nominal — a `Movie` is a `Movie` because it says so. TypeScript is
**structural**: anything with the right shape _is_ the type.

```ts
type Movie = { id: number; title: string };
const row = { id: 1, title: 'Alien', extra: true };
const m: Movie = row; // fine — shape matches
```

Consequences:

- No `implements` needed. A function taking `{ title: string }` accepts any object with one.
- Two unrelated types with identical shapes are interchangeable. There is no
  `MovieId`-vs-`UserId` safety unless you deliberately brand it.
- "Does it compile?" is about shape, never about declared lineage.

## `undefined` vs `null`

C# has one absence (`null`, plus nullable annotations). JS has two.

| Value       | Means                                                |
| ----------- | ---------------------------------------------------- |
| `undefined` | never set — missing property, missing arg, no return |
| `null`      | deliberately set to nothing — a NULL database column |

In this repo: DB nullable columns come back as `null`; optional args and absent
object keys are `undefined`. `value == null` matches both, but we use `===` and
compare explicitly.

`strictNullChecks` is on, so `string | null` is a real type — like C# nullable
reference types, but enforced rather than advisory. No `!` allowed (ours is the
lint ban, not the language).

## Operators

| Write               | Because                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `===`, `!==`        | `==` coerces (`'' == 0` is true). Never use it                                      |
| `??`                | Null-coalescing, like C#. Only `null`/`undefined` trigger it                        |
| `?.`                | Null-conditional, like C#                                                           |
| `x !== ''`, `n > 0` | `\|\|` and truthiness swallow `''` and `0` — `strict-boolean-expressions` bans them |

## Syntax you will meet

```ts
const { title, genres } = movie; // destructuring — like deconstruction, by name
const [first, ...rest] = items; // array destructuring + rest
const next = { ...movie, title: 'New' }; // spread — shallow copy with override
const upper = (s: string) => s.toUpperCase(); // arrow function = lambda
```

**Arrow functions and `this`.** An arrow captures `this` from where it was
written; a `function` gets `this` from how it was _called_. This is the classic
JS trap. Use arrows, avoid `this` outside classes, and it never bites.

## Async

```ts
const movies = await fetchMovies(); // fetchMovies() already started when called
```

- Calling an async function starts it. `Promise.all([a(), b()])` is `Task.WhenAll`.
- A promise you never await is a **floating promise** — a lint error here.
- Single-threaded event loop: no locks, no `Interlocked`, no thread pool.

## Generics

Same syntax, different runtime. TypeScript generics are **erased** — no
reification.

- `typeof` cannot tell you `T`. There is no `typeof(T)`, no `Activator.CreateInstance<T>()`.
- No generic constraints on constructors, no runtime type checks on `T`.
- If you need to know a shape at runtime, you need a Zod schema — a value, not a type.

## Why types vanish, and why Zod is everywhere

TypeScript compiles to JavaScript by **deleting** the types. Nothing is checked
at runtime. An HTTP response typed `Movie` is just whatever the server sent.

So this repo parses at every boundary — env, request bodies, params, the Hugging
Face dataset — with Zod, and trusts types only inside that boundary. That is also
why `as` is banned: `as` is a claim with no check behind it. Uncertain? `.parse()` it.

`enum` is banned for a different reason: `erasableSyntaxOnly` rejects any syntax
that emits runtime code. A TS `enum` compiles to an object, so it is out. Use
`z.enum(['movie', 'series'])` and `z.infer` the union — you get the type _and_ a
runtime validator.

## Traps for C# developers

- `==` coerces. Always `===`.
- `0`, `''`, `NaN` are falsy — an empty title behaves like "missing". Compare explicitly.
- `arr[0]` is `T | undefined` (`noUncheckedIndexedAccess`). Narrow it; `!` is banned.
- `number` is a float. No `int`, no `decimal`. SQLite integer columns are still numbers.
- Objects compare by reference: `{a:1} === {a:1}` is false. No value equality, no `record`.
- `import type` is required for type-only imports (`verbatimModuleSyntax`).
- A "cold task" does not exist — you cannot hand around an unstarted promise.

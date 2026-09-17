---
name: self-review
description: Review your own diff, and code an AI agent wrote for you, before claiming a change is done. Use after implementing anything and before running the gate or committing.
---

Run this before you say "done". It takes minutes; a bad review costs hours.

## The checklist, in order

1. **Read the whole diff cold.** `git diff` top to bottom, as a stranger who did
   not write it. If you have to remember context to follow a hunk, that hunk
   needs a name or a comment.
2. **Trace every new field to `schema.ts`.** A field that appears first in a
   handler, a hook, or a Zod object is a second definition. Go back to step 1 of
   `add-feature`.
3. **Did you hand-write anything derivable?** A `type`/`interface` for a row, a
   `z.object` that mirrors a table, migration SQL, a `fetch`. All of these are
   generated. Delete and derive.
4. **Scan for banned constructs.** `any`, `as` (`as const` is fine), `!`,
   `default export`, `enum`, truthiness on a string or number, `||` for a
   default, `eslint-disable`, `@ts-expect-error`. See `code-style`.
5. **Every new route has a test that calls it through the client.** Real app on
   port 0, real oRPC client, success path _and_ the failure the contract
   declares. A route without one is not done.
6. **Narrowing, not silencing.** Every `arr[0]`, every nullable column: narrowed
   with an explicit check that throws or handles, never asserted away.
7. **Comments say why.** Delete anything restating the code. Keep anything
   explaining a tradeoff, a workaround, or a non-obvious constraint.
8. **No leftovers.** Commented-out code, `console.log`, a scratch file, an unused
   import, a TODO with no owner.
9. **The gate.** `npm run check` green. See `verify`. Red gate, not done — no exceptions.

## Reviewing what an agent wrote for you

You are accountable for code you did not type. An agent is fast, confident, and
wrong in specific, recognisable ways. Distrust in this order:

| Suspect                       | Looks like                                                              | Check                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Invented API**              | A plausible Mantine prop, Drizzle method or Zod helper that reads right | Find it in `node_modules` or the docs. Typecheck alone can miss a wrong _runtime_ shape |
| **Duplicated type**           | A neat `interface Movie` or `z.object` beside the derived one           | Does it trace to `schema.ts`? If not, delete it                                         |
| **Test that asserts nothing** | Calls the route, checks `status === 200`, ends                          | Does it assert the value the bug would change?                                          |
| **Swallowed error**           | `try { ... } catch { return [] }`, `?? 0` over a parse failure          | Fail loudly at the boundary; a default hides the fault                                  |
| **Suppressed type error**     | `as`, `!`, `any`, a widened return type, a loosened Zod field           | The error was information. Fix the cause upstream                                       |
| **Passing-by-construction**   | The test was edited until it passed                                     | Read the test diff, not just the result                                                 |
| **Scope creep**               | Files in the diff you never asked about                                 | Revert anything unrelated to the task                                                   |

Two habits worth more than the rest:

- **Ask it to justify one line.** "Why this, and what breaks without it?" A
  confident wrong answer that cites nothing is the tell. Verify the citation.
- **Make it show the failure.** Before accepting a fix, have it demonstrate the
  test failing without the change. A fix for a bug that was never reproduced is
  a guess.

Never accept "the gate is green" as a review. The gate catches types, lint, and
the tests that exist — not a missing test, a wrong query, or a duplicated
definition it never saw.

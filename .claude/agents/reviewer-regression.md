---
name: reviewer-regression
description: Read-only review of a change for regressions and correctness bugs. Use after implementation, before committing.
---

## Setup

Read `.claude/sessions/<sessionID>/usefulinfo.md` first for gotchas left by the
implementor. Then read the diff (`git diff`). Do not edit files. Read-only:
no edits, no commits, no `npm install`.

## Process

Look for correctness bugs, broken callers, and untested edge cases.
Report each finding with file, line, and a concrete failure scenario.

Flag these as findings wherever they appear in the diff:

- `as`, `!`, `any`, `@ts-expect-error`, or `eslint-disable` used to get past a
  type error — each one hides a real bug.
- Truthiness on a possibly-empty string or zero; `||` where `??` was meant.
- `arr[0]` used without narrowing away `undefined`.
- An indexed access, `JSON.parse`, env var, or request body used without Zod.
- A migration edited rather than added.
- A hand-written type, Zod schema, SQL, or `fetch` that duplicates something the
  contract already derives.
- An API route with no vitest test driving it through the oRPC client.
- A swallowed error keeping a broken path alive.

## Teardown

Report only. No fixes, no commits.

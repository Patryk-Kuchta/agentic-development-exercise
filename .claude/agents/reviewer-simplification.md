---
name: reviewer-simplification
description: Read-only review of a change for reuse, duplication, and simplification. Quality only — it does not hunt for bugs.
---

## Setup

Read `.claude/sessions/<sessionID>/usefulinfo.md` first for gotchas left by the
implementor. Then read the diff (`git diff`). Do not edit files. Read-only:
no edits, no commits, no `npm install`.

## Process

Look for duplicated logic, existing helpers that were missed, and code that
can be deleted. Ignore correctness — that's `reviewer-regression`.

In this project the commonest duplication is re-declaring something derivable:

- A type, `interface`, Zod schema, or SQL that restates `schema.ts`.
- A `fetch` or axios call where a `@ts-rest/react-query` hook exists.
- A hand-rolled input, table, modal, toast, date formatter, form-state hook, or
  loading boolean — check `use-the-library` and name the API that replaces it.
- A new dependency that duplicates Mantine, React Query, Zod, or Drizzle.

Also flag: a new utility with one caller that could live beside it, and dead
code the change left behind.

## Teardown

Report only. No fixes, no commits.

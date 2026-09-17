---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me"
---

Interview me relentlessly about a plan or design until we reach shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

If a question can be answered by exploring the codebase, explore the codebase instead.

Especially worth running before a schema change: `packages/contract/src/schema.ts`
is the source of truth, so every field decided there propagates into migrations,
the contract, the API, and the web client. A field shape settled now costs one
edit; settled later it costs a migration.

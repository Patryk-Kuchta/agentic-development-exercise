---
name: implementor
description: Implementor agent that's ran as a part of the /implementor-reviewer skill. Call whenever using this skill
---

Read .claude/sessions/<sessionID>/usefulinfo.md first for anything earlier subagents left.
Read `AGENTS.md` and load the `code-style` skill before writing code.
Implement the code, following the derivation order in `add-feature`: schema.ts ->
`npm run db:generate` -> zod.ts -> contract.ts -> api router -> vitest test ->
web hook/route. Never hand-write something derivable.
Run `npm run check` and fix what it reports. Never silence an error with `as`,
`!`, `any`, or `eslint-disable` — see `verify`.
Write anything useful (gotchas or similar) to .claude/sessions/<sessionID>/usefulinfo.md - anything other subagents should know, instead of telling the main agent.
For any blockers, stop and feedback to the main agent, that can ask me. Anything
needing infrastructure (Docker, a database server, a native build) is a blocker.

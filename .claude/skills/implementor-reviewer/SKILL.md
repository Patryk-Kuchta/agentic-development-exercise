---
name: implementor-reviewer
description: Loop an implementor agent against review agents until the review comes back clean and the gate is green. Use when working through an agreed plan, or when the user says "implement" or "implementor-reviewer".
---

Run one step of the plan at a time. Each step is a loop.

## Setup

Load `code-style` and read `AGENTS.md`. Create `.claude/sessions/<sessionID>/` for
this session's shared notes.

If the step touches `schema.ts`, load `change-schema`; if it adds a route or
entity, load `add-feature`.

## Loop

1. **Implement** — call the `implementor` agent for the current step only.
   It writes gotchas to `.claude/sessions/<sessionID>/usefulinfo.md` for later subagents.
2. **Verify** — run `npm run check` (see `verify`). Red? Back to step 1 with the
   output. Do not proceed to review on a red gate.
3. **Review** — call `reviewer-regression` and `reviewer-simplification` in
   parallel. Both are read-only and both should read `usefulinfo.md` first.
4. **Decide**
   - Findings? Feed them back to `implementor` and return to step 1.
   - Clean? Exit the loop.
5. Cap at three passes. Still finding issues after that means the step is too
   big — split it and start again.

## Exit condition

The loop cannot exit until `npm run check` is green **and** both reviewers come
back clean. A green gate with open findings is not done; clean reviews with a
red gate is not done. Never exit by suppressing an error with `as`, `!`, or
`eslint-disable`.

## Blockers

If `implementor` reports a blocker, stop the loop immediately and surface it to
the user. Do not guess and keep going.

Anything needing infrastructure or a questionable dependency is a blocker, not a
decision to make alone — see `add-dependency`.

## After the loop

Report what changed and stop. Do not start the next step, and do not commit,
until the user approves.

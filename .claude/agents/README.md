# Agents

Subagents run in their own context and report back. Frontmatter is `name` +
`description`; the description is what routes work to them.

- `implementor` — writes code, one step at a time
- `reviewer-regression` — read-only, hunts correctness bugs
- `reviewer-simplification` — read-only, hunts duplication and hand-rolled code

They share notes through `.claude/sessions/<sessionID>/usefulinfo.md`: the implementor
writes gotchas there, the reviewers read it first. That keeps findings out of
the main agent's context.

Driven together by the `implementor-reviewer` skill.

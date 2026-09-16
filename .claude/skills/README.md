# Skills

Skills load on demand, so detail lives here rather than in `.claude/rules/`.

Workflow skills

- `add-feature` — new entity or route, in the only order that works
- `change-schema` — edit the schema, generate the migration, don't hand-write the rest
- `implementor-reviewer` — agent orchestration loop, exits only when the gate is green
- `grill-me` — interrogate a plan before building it

Code-shaping skills

- `code-style` — naming, functions, errors, comments, tests
- `use-the-library` — check the library before writing a helper

Gotcha skills the agent doesn't need loaded by default

- `verify` — run the gate, read each failure class
- `add-dependency` — what disqualifies a package
- `git-commit-format` — commit message shape

Every skill is `<name>/SKILL.md` with `name` and `description` frontmatter. The
description is what makes it trigger — write it as
"<what it does>. Use when <cases>."

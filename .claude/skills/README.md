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
- `debug-this-stack` — symptom to fix, for the failures this stack actually produces
- `ingest-data` — operating the Hugging Face ingest

Learning skills, for people new to the stack rather than to programming

- `start-here` — what this repo is and what to build first
- `js-for-csharp-devs` — C#/.NET to TypeScript, npm and ESM
- `frontend-for-csharp-devs` — Blazor/Razor to React, Mantine and React Query
- `self-review` — review your own diff, and review what an agent wrote for you

Every skill is `<name>/SKILL.md` with `name` and `description` frontmatter. The
description is what makes it trigger — write it as
"<what it does>. Use when <cases>."

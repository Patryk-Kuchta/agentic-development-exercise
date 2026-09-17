# Movie Suggester

Build a film recommender over 1455 movies, with an AI coding agent as your pair.

## Setup

**1. Install nvm** — it handles Node versions for you.

- macOS / Linux: [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Windows: [nvm-windows](https://github.com/coreybutler/nvm-windows#installation--upgrades)

**2. Get the right Node.** This repo needs Node 24, pinned in `.nvmrc`.

```sh
nvm install        # reads .nvmrc and installs it
nvm use
```

On Windows, nvm-windows ignores `.nvmrc` — use `nvm install 24` then `nvm use 24`.

**3. Run it.**

```sh
npm install
npm run dev
```

Open <http://localhost:5173>. The API downloads the dataset on first start, so the
movie count fills in after a few seconds.

If anything fails, the error tells you what to do. `npm run check` is the one command
that says whether your work is finished.

## What's here already

- **1455 films** from the [`MongoDB/embedded_movies`](https://huggingface.co/datasets/MongoDB/embedded_movies)
  dataset — plots, cast, genres, ratings, posters.
- **A plot embedding per film**: 1536 numbers describing what it is _about_. Exercise 3 uses these.
- **One place a field is declared** — `packages/contract/src/schema.ts`. The database migration,
  the validation, the API types and the React hooks are all generated from it.
- **A working vertical slice**: SQLite → Express API → React page, so you have a pattern to copy.
- **A landing page** that counts what was ingested. That is the whole UI so far.
- **No infrastructure.** No Docker, no database server, no API keys. Just npm.

Three workspaces: `packages/contract` (the source of truth), `apps/api`, `apps/web`.

## The exercises

Do them in order — each builds on the last. Each has a worked answer on its own branch,
but read the brief first.

| #                                | Build                                                  | Answer branch                 |
| -------------------------------- | ------------------------------------------------------ | ----------------------------- |
| **[1](exercises/EXERCISE-1.md)** | Browse the films: a paginated list and a page per film | `exercise-1-example-solution` |
| **[2](exercises/EXERCISE-2.md)** | Sign up, sign in, and favourite films that persist     | `exercise-2-example-solution` |
| **[3](exercises/EXERCISE-3.md)** | "Because you liked…" — suggestions from the embeddings | `exercise-3-example-solution` |

<details>
<summary><b>How to work with the AI on each one</b> — the real point of the exercise</summary>

Each exercise deliberately levels up **how** you use the agent, not just what you build.
Same tool, three ways of working.

### Exercise 1 — Ask, plan, review

Keep it conversational and hands-on. You are still the one typing most of the code.

- **Ask before you build.** "How does the contract turn into a React hook?" "Why does this
  type error?" Use it to understand the codebase, not to skip it.
- **Plan first.** Before any code, get it to write the plan: which files, in which order,
  and why. Push back on the plan. A bad plan is cheap to fix; bad code is not.
- **Take small snippets**, not whole features. Paste, read, understand, keep.
- **Review everything it gives you, and ask why.** "Why this and not that?" "What breaks if
  the list is empty?" If it cannot justify a line, do not keep the line.

Do not bother with skills or automation yet. Goal: judgement.

### Exercise 2 — Close the loop

Now let it check its own work, so you review outcomes instead of characters.

- **Let it run the tools**: `npm test`, `npm run lint`, `npm run check`. It should iterate
  until green without you relaying error messages.
- **Ask for the test first**, then the code that passes it.
- **Review faster and higher up**: read the diff, not every line. Look for the things tests
  cannot catch — a duplicated type, a swallowed error, a hand-written `fetch`.
- **Make it prove things.** "Show me the failing test before you fix it."

Goal: a tight feedback loop where the gate does the checking.

### Exercise 3 — Drive it properly

The problem is open-ended, so the work is mostly deciding what to build.

- **Brainstorm the design conversationally.** Argue about approaches before committing.
  What makes a _good_ suggestion? How do you know it worked?
- **Use the skills** in `.claude/skills/` — and write a prompt you would reuse.
- **Hand it whole slices** and judge the result against the brief.
- **Let it disagree with you**, and take the argument seriously.

Goal: using it as a collaborator on an ambiguous problem.

</details>

## Commands

| Command          | Does                                                  |
| ---------------- | ----------------------------------------------------- |
| `npm run dev`    | API and web, both watching                            |
| `npm run check`  | **The gate.** Types, lint, format, tests, build       |
| `npm run ingest` | Re-download the dataset (`-- --limit=50` for a slice) |

## The rules

1. **Derive, don't duplicate.** A field is declared once, in `schema.ts`. Never hand-write a
   type, a Zod schema, a migration or a `fetch` that could be generated from it.
2. **npm only.** No Docker, no database server, no API keys. If a task seems to need
   infrastructure, it doesn't.

Strict TypeScript: no `any`, no `as`, no `!`, no default exports. A type error here is
usually the design telling you something true.

New to this stack? Start with the `start-here` skill in `.claude/skills/` — there are
guides for C# developers too. Full detail for agents lives in [AGENTS.md](AGENTS.md).

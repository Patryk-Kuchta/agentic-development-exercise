# Movie Suggester

Build a film recommender over 1455 films, with an AI coding agent as your pair.

## Setup

Clone the repo:

```sh
git clone https://github.com/Patryk-Kuchta/agentic-development-exercise.git
cd agentic-development-exercise
```

You need **Node 24** (pinned in `.nvmrc`). Any way of getting it works — nvm is just the
easiest:

- **Linux, macOS, WSL** — [nvm](https://github.com/nvm-sh/nvm#installing-and-updating), then
  `nvm install && nvm use`. It reads `.nvmrc`.
- **Native Windows** — nvm does not support it; use
  [nvm-windows](https://github.com/coreybutler/nvm-windows#installation--upgrades), which
  ignores `.nvmrc`: `nvm install 24 && nvm use 24`.

Then:

```sh
npm install
npm run dev
```

Open <http://localhost:5173>. The API downloads the dataset on first start, so the film count
fills in shortly after.

`stmt.setReturnArrays is not a function` means Node 23 or below, and nothing else.

## What you start with

- **1455 films** from
  [`MongoDB/embedded_movies`](https://huggingface.co/datasets/MongoDB/embedded_movies) — plots,
  cast, genres, ratings, posters, and a 1536-float `plot_embedding` for all but 27 of them.
- **Three workspaces**: `packages/contract` (the source of truth), `apps/api` (Express + oRPC +
  Drizzle over `node:sqlite`), `apps/web` (Vite + React 19 + Mantine + TanStack Query).
- **A working vertical slice** — SQLite → API → React — plus accounts and an empty
  `favourites` table. The landing page counting the ingest is the whole UI so far.
- **No infrastructure.** No Docker, no database server, no API keys.

## Your branch

Your trainer will tell you which branch to start on.

```sh
git checkout <branch>
```

| Branch                | Start here for | Adds                                          |
| --------------------- | -------------- | --------------------------------------------- |
| `main`                | Exercise 1     | The app. No linting, no tests, no agent rules |
| `exercise-1-solution` | —              | A worked answer to exercise 1                 |
| `exercise-2-setup`    | Exercise 2     | `npm run check` and the written house rules   |
| `exercise-2-solution` | —              | A worked answer to exercise 2                 |
| `exercise-3-setup`    | Exercise 3     | The skills, subagents and hooks in `.claude/` |
| `exercise-3-solution` | —              | A worked answer to exercise 3                 |

The branches stack, and they share one `package-lock.json` — so `npm install` after a checkout
is harmless, and installs the git hook the gate branches add. A fresh clone is already on
`main`, so exercise 1 needs no checkout.

Read a solution branch after you have built your own, not instead of it. To carry your own work
up the stack, see **Advanced** below.

<details>
<summary>Moving between branches</summary>

Work on your own branch, so a checkout never threatens your code:

```sh
git switch -c my-exercise-1     # before you start
```

Commit or stash before switching, or git refuses:

```sh
git stash                       # always works
git checkout exercise-2-setup
npm install                     # harmless, and installs the git hook
```

Committing works too, but from `exercise-2-setup` on the pre-commit hook lints what you
staged — so `git commit -am "wip"` can be refused by the very errors you were parking.
`git stash` or `--no-verify` never is.

Back to the start, or to see what is on offer:

```sh
git checkout main
git branch -a
```

To push your own work, fork the repo on GitHub first and push to your fork.

</details>

## The exercises

Each one levels up **how** you use the agent, not just what you build — same tool, three ways
of working, and that, not the app, is the point. Every exercise ends with the way of working it
is asking for.

### Exercise 1 — Browse the movies

Start on `main` · answer on `exercise-1-solution`

1455 films are in SQLite and nobody can look at one. Build a list people can browse and a page
per film.

- **A paginated list** — served a page at a time rather than the whole table, and refusing a
  daft page size, with enough in the response for a pager to draw itself.
- **A page per film**: plot, cast, crew, awards, and an honest 404 when the id is unknown.
- **Search by title, filter by genre, sort by rating** — and all of it in the URL, so page 7 of
  "Comedy by rating" is a link someone else can open.
- **Loading, error and empty states** that each render something deliberate.
- `plot_embedding` is exercise 3's, and never leaves the server.

`main` has no linter, no test runner and no instructions for the agent. That is deliberate:
this one is you and the agent with no guardrails, and your judgement is the only check.

**Done when** you can search "alien", sort by rating, land on page 2, click a film and read
about it.

<details>
<summary><b>Working with the agent</b> — ask, plan, review</summary>

With nothing checking the agent's work but you, you are still the one typing most of the code.

- **Ask before you build.** "How does the contract turn into a React hook?" Use it to
  understand the codebase, not to skip it.
- **Plan first**, and push back on the plan. A bad plan is cheap to fix; bad code is not.
- **Take small snippets**, not whole features. Paste, read, understand, keep.
- **Ask why.** If it cannot justify a line, do not keep the line.

</details>

### Exercise 2 — Favourites

Start on `exercise-2-setup` · answer on `exercise-2-solution`

This branch adds the gate. `npm run check` — types, lint, format, tests, `db:check`, build — is
now the single definition of done, and `AGENTS.md` plus the per-workspace `CLAUDE.md` files are
the house rules in writing, for you and the agent both. **A route is not done without a test
that calls it through the client.**

**Accounts already work** — sign-up, sign-in, sign-out and a header; start by reading
`apps/api/src/accounts.ts`. Sessions live in the API process rather than the database, so
**restarting the API signs everyone out**. That is deliberate: who is signed in is a fact about
a running process, and a teaching app may lose it.

**The `favourites` table already exists** — empty, migration committed. Wiring it up is the
exercise; you should not need `npm run db:generate` at all.

- **Favourite and unfavourite a film.** Favouriting one that does not exist is a 404, doing it
  signed out is a 401, and a double-clicked heart is not an error.
- **Every film says whether you have favourited it**, and a list can be narrowed to just those.
  Anonymous callers get an answer rather than an error — and a page of cards costs one query,
  not one per card.
- **Favouritedness is answered per request**, never stored on the film.
- **A heart wherever a film appears**, a favourites page, and a UI that still agrees with the
  server after every change.

**Done when** you can favourite three films, sign out, sign in as somebody else, see none of
theirs, sign back in and find all three — as long as you have not restarted the API.

<details>
<summary><b>Working with the agent</b> — close the loop</summary>

The gate exists now, so let the agent run it and review outcomes instead of characters.

- **Let it run `npm run check`** and iterate until green without you relaying error messages.
- **Ask for the test first**, then the code that passes it.
- **Read the diff, not every line.** Look for what tests cannot catch: a duplicated type, a
  swallowed error, a hand-written `fetch`.

</details>

### Exercise 3 — Suggestions

Start on `exercise-3-setup` · answer on `exercise-3-solution`

This branch, and only this branch, adds `.claude/` — the skills, subagents and hooks listed in
**The skills** at the end. Use them; this is the exercise where you drive the agent rather than
type.

Every film carries a `plot_embedding` — a vector standing in for what its plot is about, so
films with similar plots have similar vectors. What to do with that is the exercise.

- **"More like this"** on a film page, with the scores shown, so a suggestion is inspectable
  rather than magic.
- **Suggestions from your favourites** — films you have not already favourited, each one
  attributed to the favourite that earned it: "because you liked _Alien_". No favourites yet
  gets something better than an empty page.
- **Honest edges.** Not every film has an embedding, and no film is its own suggestion.
- **Fast, and server-side.** No vector database, no API key, no new service, and nothing that
  sends embeddings to the browser.

Decide with the agent how similarity should work, what makes a suggestion a good one, and what
tests would convince you the numbers are right rather than merely plausible.

**Done when** any film shows plausible neighbours, and three favourites produce a sensible
suggestion that names the favourite it came from.

<details>
<summary><b>Working with the agent</b> — drive it</summary>

The problem is open-ended, so the work is mostly deciding what to build.

- **Brainstorm the design.** What makes a _good_ suggestion? How do you know it worked?
- **Use the skills** — by name, or let the agent pick — and write a prompt you would reuse.
- **Hand it whole slices** and judge the result against the brief.
- **Let it disagree with you**, and take the argument seriously.

</details>

<details>
<summary><b>Advanced</b> — carry your own solution forward</summary>

`exercise-2-setup` contains the _example_ answer to exercise 1, so checking it out replaces
your work with somebody else's. To keep your own and still get the tooling, cherry-pick the
setup commits onto your own branch instead:

```sh
git checkout my-exercise-1
git cherry-pick exercise-1-solution..exercise-2-setup^
npm install
```

The `^` drops the last commit — tests written against the example solution, not yours. For
exercise 3 nothing needs dropping:

```sh
git checkout my-exercise-2
git cherry-pick exercise-2-solution..exercise-3-setup
```

`npm run check` is now the definition of done and is seeing your exercise 1 for the first
time — expect lint complaints, and no tests on your own routes. Clearing that is the first half
of exercise 2.

Hand the whole job to Claude — cherry-pick, conflicts and failures. It is exactly the kind of
work it is good at.

</details>

## The stretch goals

Thirty-odd small extras. No answer branches; you are on your own, which is the point.

<details>
<summary>Pick one you would actually use</summary>

**Games**

- **Higher or lower** — two posters, guess which IMDb rates higher. The design problem is
  picking a fair pair.
- **Guess the plot** — a plot with the title and cast redacted. Redaction leaks the answer in
  more ways than you expect.
- **Odd one out** — three films close in embedding space, one from far away.
- **Six degrees** — connect two actors through shared casts, and show the chain.
- **Film of the day** — one film for everybody, seeded by the date, so a test can assert it.
- **Blind taste test** — ten poster pairs build a taste vector without an account.
- **Plot chain** — hop from _Alien_ to _Legally Blonde_ by nearest neighbour.

**Charts and leaderboards**

- **Genre co-occurrence** heatmap. Comedy-Romance is the boring answer.
- **Critics versus the crowd** — IMDb against Metacritic, and who disagrees most.
- **The ninety minute wall** — runtime histogram, and rating by runtime.
- **Leaderboards** — most prolific, most awarded, best rated. Pick a minimum film count and
  defend it.
- **Your taste, in numbers** — your favourites against the catalogue average.

**Embeddings, further**

- **Mood shelves** — k-means the vectors into a dozen clusters and name each one.
- **The map** — the whole catalogue projected to 2D, coloured by genre.
- **Misfiled films** — the film furthest from the centroid of its own genre.
- **Near-duplicate hunt** — remakes, sequels, and films with the same plot.
- **Anti-suggestions** — the film least like your taste.
- **Explain the score** — shared genres, cast and words beside the cosine number.

**Craft**

- **Command palette** (ctrl-K), **poster fallbacks** for the dead URLs, **dark mode**,
  **shareable top five** in the URL, **favourites export/import**, **published API docs**, **a
  terminal client** over the same typed client, **keyboard navigation**, **an accessibility
  pass**, **skeletons instead of spinners**.

**Under the hood**

- **Add a column the ingest throws away** — the whole schema-to-UI flow end to end.
- **Make ingest legible** — progress, a summary, and no redone work.
- **A fixture database** so tests can assert _which_ neighbour comes back.
- **Measure the scan** at 1455 vectors, then at 150,000.
- **Break rule 2, deliberately** — free-text search with a real embedding model, optional and
  honest about it.

</details>

## Commands

| Command             | Does                                                    |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | API and web, both watching                              |
| `npm run typecheck` | `tsc --noEmit` across the workspaces                    |
| `npm run check`     | The gate: types, lint, format, tests, `db:check`, build |
| `npm run ingest`    | Re-download the dataset (`-- --limit=50` for a slice)   |

`npm run check` is exercise 2's: it arrives with `exercise-2-setup`, along with `lint`, `test`
and the pre-commit hook. `main` has no gate. From that branch on, `AGENTS.md` and the
per-workspace `CLAUDE.md` files carry the detail for agents.

## The skills

Exercise 3's, and nowhere else: `.claude/` arrives with `exercise-3-setup`. Invoke a skill by
name, or let the agent pick.

| Skill                  | For                                                             |
| ---------------------- | --------------------------------------------------------------- |
| `start-here`           | What the app is, how to run it, what the exercises ask          |
| `learn-this-stack`     | The repo explained in a language you already write              |
| `learn-the-frontend`   | React, Mantine and TanStack Query from whatever UI you know     |
| `code-style`           | The naming, layout and conventions of this repo                 |
| `add-feature`          | A new entity or route, contract → api → web                     |
| `change-schema`        | A schema edit and the migration that belongs with it            |
| `add-dependency`       | Whether an npm package is allowed here                          |
| `use-the-library`      | The library feature that already does the job                   |
| `ingest-data`          | Running, limiting and resetting the movie ingest                |
| `debug-this-stack`     | Failures by symptom, each with its fix                          |
| `verify`               | Run the gate and read what it says                              |
| `self-review`          | Review the diff — yours and the agent's — before claiming done  |
| `grill-me`             | Be interrogated on a plan until it holds                        |
| `implementor-reviewer` | Loop an implementor against reviewers until the review is clean |
| `git-commit-format`    | Commit messages in this repo's format                           |

Beside them, `.claude/agents/` holds an implementor and two reviewers, and `.claude/hooks/`
blocks infrastructure, logs permission prompts, and — if you opt in — refuses to end a turn
until the gate is green.

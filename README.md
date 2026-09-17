# Movie Suggester

Build a film recommender over 1455 films, with an AI coding agent as your pair.

## Setup

You need **Node 24** (pinned in `.nvmrc`) and the npm that ships with it.

nvm is the easiest way to get it:

- **Linux, macOS, or WSL on Windows** —
  [nvm](https://github.com/nvm-sh/nvm#installing-and-updating), then `nvm install && nvm use`.
  It reads `.nvmrc`.
- **Native Windows** — there is no official nvm for Windows; `nvm-sh/nvm` does not support it.
  Use [nvm-windows](https://github.com/coreybutler/nvm-windows#installation--upgrades), the
  separate project nvm's own README points to. It ignores `.nvmrc`, so
  `nvm install 24 && nvm use 24`.

nvm is optional — skip it if you already manage Node another way. Just make sure `node -v`
says v24 and `npm -v` is modern. Those two things are all that matters.

Then:

```sh
npm install
npm run dev
```

Open <http://localhost:5173>. The API downloads the dataset on first start, so the film count
fills in after a few seconds.

Node 23 or below fails every migration with `stmt.setReturnArrays is not a function`. That
error means the wrong Node and nothing else.

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

Each branch is built on the one above it, so later branches carry everything the earlier ones
do. They all share one `package-lock.json`, so `npm install` once covers every branch — run it
again after a checkout anyway, which is harmless and installs the git hook the gate branches
add.

A fresh clone is already on `main`, so exercise 1 needs no checkout.

The solution branches are worked answers. Read one after you have built your own, not instead
of it. Want to keep your own work as you move up the stack? See **Advanced** below.

<details>
<summary>Moving between branches</summary>

Work on your own branch, so a checkout never threatens your code:

```sh
git switch -c my-exercise-1     # before you start
```

Commit or stash before you switch, or git will refuse:

```sh
git stash                       # always works
git checkout exercise-2-setup
npm install                     # harmless, and installs the git hook
```

Committing instead of stashing is fine, but from `exercise-2-setup` on the pre-commit hook
lints what you staged, so `git commit -am "wip"` can be refused by the very lint errors you
were trying to park. `git stash`, or `git commit --no-verify`, never is.

Back to the start, or to see what is on offer:

```sh
git checkout main
git branch -a
```

To push your own work, fork the repo on GitHub first and push to your fork.

</details>

## The exercises

Do them in order — each builds on the last. Three rules apply throughout:

1. **Derive, never duplicate.** A field is declared once, in
   `packages/contract/src/schema.ts`. Work in that direction: schema → migration → `zod.ts` →
   `contract.ts` → handler → web. Never hand-write a type, a Zod schema, a migration or a
   `fetch`.
2. **Reshape, don't redeclare** — `.pick()`, `.omit()` and `.extend()` on a derived schema.
3. **npm only.** No Docker, no database server, no API keys, no native builds. Any pure-JS npm
   package is fine.

### Exercise 1 — Browse the movies

Start on `main` · answer on `exercise-1-solution` · a couple of hours

1455 films are in SQLite and nobody can look at one. Build a paginated list and a page per
film. Ignore `plot_embedding` — that is exercise 3's.

- `GET /api/movies` — one page, not the whole table. `page` and `pageSize` with defaults and
  **bounds** (`pageSize=100000` must be refused), plus the total so a pager can draw itself.
  `LIMIT`/`OFFSET` and a `COUNT` in SQL; reading everything then `.slice()` is the wrong answer.
- `GET /api/movies/{id}` — one film, and a declared 404 when the id is unknown.
- Title search, genre filter, sort by IMDb rating. Neither endpoint ever returns
  `plotEmbedding`.
- A card grid with working pagination; a detail page with plot, cast, crew and awards.
- **Search, filter, sort and page live in the URL**, so page 7 of "Comedy by rating" is a link
  someone else can open. Loading, error and empty states each render something deliberate.

Genres are a JSON column, so "has genre X" is not a plain `=` — look at SQLite's JSON
functions. The genre dropdown needs its own small endpoint. Mantine already has `Pagination`,
`Card`, `SimpleGrid` and `Select`.

`main` has no linter, no test runner and no instructions for the agent. That is deliberate:
this one is you and the agent with no guardrails, and your judgement is the only check.

**Done when** you can search "alien", sort by rating, land on page 2, click a film and read
about it.

### Exercise 2 — Favourites

Start on `exercise-2-setup` · answer on `exercise-2-solution` · half a day

This branch adds the gate. `npm run check` — types, lint, format, tests, `db:check`, build — is
now the single definition of done, and `AGENTS.md` plus the per-workspace `CLAUDE.md` files are
the house rules in writing, for you and the agent both. **A route is not done without a test
that calls it through the client.**

**Accounts already work** — sign-up, sign-in, sign-out and a header. Read
`apps/api/src/accounts.ts` first. Sessions are a `Map` in the API process, not a table, so
**restarting the API signs everyone out**. That is deliberate: who is signed in is a fact about
a running process, and a teaching app may lose it.

**The `favourites` table already exists** — `userId` + `movieId` as a composite primary key,
cascading foreign keys, migration committed. It is empty, and wiring it up is the exercise. You
should not need `npm run db:generate` at all.

- Add and remove a favourite. Favouriting a film that does not exist is a 404; doing it while
  signed out is a 401.
- The composite key makes a duplicate impossible in the database, and `onConflictDoNothing()`
  turns a double-clicked heart into "already done" rather than a 500.
- Every film in a list says whether the caller has favourited it, and the list gains a
  "favourites only" filter. **Anonymous callers get `false`, not an error.**
- `isFavourite` is computed per request, never stored on the film — an `.extend()` on the
  derived schema. On a page of 24 cards that is one query, not 24.
- A heart on every card and on the detail page, a favourites page, and a toggle on the list.
  After a mutation, `invalidateQueries` — a `useState` mirror of the server is two truths.

**Done when** you can favourite three films, sign out, sign in as somebody else, see none of
theirs, sign back in and find all three — as long as you have not restarted the API.

### Exercise 3 — Suggestions from the embeddings

Start on `exercise-3-setup` · answer on `exercise-3-solution` · half a day

This branch adds `.claude/` — skills, subagents and hooks. Use them; this is the exercise where
you drive the agent rather than type.

Every film carries `plot_embedding`: 1536 floats encoding what its plot is _about_. Similar
plots point in similar directions, and that is **cosine similarity** —
`dot(a, b) / (magnitude(a) * magnitude(b))`. About ten lines. Nothing to install.

- "More like this" on the detail page: the N closest films. A film is never similar to itself,
  and one with no embedding gives an honest empty result rather than a crash.
- A suggestions page from the signed-in user's favourites: build one taste vector, suggest the
  closest films they have **not** favourited, and say which favourite each came from — "because
  you liked _Alien_". No favourites yet gets "favourite something first".
- Return the scores and show them, so the result is inspectable rather than magic.

**No vector database, no API key, no new service.** 1455 vectors is ~9 MB, so scanning all of
them is milliseconds. Decode each **once**, not once per comparison. Do not assume unit
length — divide by the magnitudes, or normalise up front and say so in a comment. A
zero-magnitude vector divides to `NaN`, and `NaN` sorts in a way that will cost you an hour.
Decode with a `Float32Array` view and narrow with `instanceof Uint8Array`; reaching for `as`
means you took a wrong turn. **Embeddings never go to the browser.**

27 of the 1455 films have no embedding. Not a bug to fix — a case to handle.

Test that similarity gives 1 for identical vectors and 0 for orthogonal ones, that a film is
not its own suggestion, that one without an embedding is excluded, and that empty favourites
give an empty list.

**Done when** any film shows plausible neighbours, and three favourites produce a sensible
suggestion that names the favourite it came from.

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

The `^` drops the last commit, which is tests written against the example solution rather than
against yours. For exercise 3 nothing needs dropping:

```sh
git checkout my-exercise-2
git cherry-pick exercise-2-solution..exercise-3-setup
```

`npm run check` is now the definition of done, and it is seeing your exercise 1 for the first
time — expect lint complaints, and your own routes still have no tests. Clearing that is the
first half of exercise 2.

Hand the whole job to Claude: the cherry-pick, the conflicts and the failures. It is exactly
the kind of work it is good at, and doing it that way is recommended.

</details>

## The stretch goals

Finished all three? Thirty-odd small extras, an hour to an afternoon each. No answer branches;
you are on your own, which is the point. Same three rules.

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

- **Add a column the ingest throws away** — the whole schema-to-UI flow in one sitting.
- **Make ingest legible** — progress, a summary, and no redone work.
- **A fixture database** so tests can assert _which_ neighbour comes back.
- **Measure the scan** at 1455 vectors, then at 150,000.
- **Break rule 2, deliberately** — free-text search with a real embedding model, optional and
  honest about it.

</details>

## Working with the agent

Each exercise levels up **how** you use the agent, not just what you build. Same tool, three
ways of working — and this, not the app, is the point.

<details>
<summary>The three ways</summary>

**Exercise 1 — ask, plan, review.** No gate and no instructions file, so your judgement is the
only check. You are still the one typing most of the code.

- **Ask before you build.** "How does the contract turn into a React hook?" Use it to
  understand the codebase, not to skip it.
- **Plan first**, and push back on the plan. A bad plan is cheap to fix; bad code is not.
- **Take small snippets**, not whole features. Paste, read, understand, keep.
- **Ask why.** If it cannot justify a line, do not keep the line.

**Exercise 2 — close the loop.** The gate exists now, so let the agent run it and review
outcomes instead of characters.

- **Let it run `npm run check`** and iterate until green without you relaying error messages.
- **Ask for the test first**, then the code that passes it.
- **Read the diff, not every line.** Look for what tests cannot catch: a duplicated type, a
  swallowed error, a hand-written `fetch`.

**Exercise 3 — drive it.** The problem is open-ended, so the work is mostly deciding what to
build — and the skills are on this branch.

- **Brainstorm the design.** What makes a _good_ suggestion? How do you know it worked?
- **Use the skills** in `.claude/skills/`, and write a prompt you would reuse.
- **Hand it whole slices** and judge the result against the brief.
- **Let it disagree with you**, and take the argument seriously.

</details>

## Commands

| Command             | Does                                                    |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | API and web, both watching                              |
| `npm run typecheck` | `tsc --noEmit` across the workspaces                    |
| `npm run check`     | The gate: types, lint, format, tests, `db:check`, build |
| `npm run ingest`    | Re-download the dataset (`-- --limit=50` for a slice)   |

`npm run check` exists from `exercise-2-setup` onward — `main` has no gate. From that branch on,
`AGENTS.md` and the per-workspace `CLAUDE.md` files carry the detail for agents.

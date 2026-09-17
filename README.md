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

Do them in order — each builds on the last. Each has a worked answer on its own branch;
build it yourself first, on a branch off the previous one.

Three rules apply to all three:

1. **Derive, never duplicate.** Work in the order in `.claude/skills/add-feature/SKILL.md`:
   schema → migration → `zod.ts` → `contract.ts` → handler → API test → web. Never
   hand-write a type, a Zod schema, a migration or a `fetch` — each step generates the next.
2. **Reshape, don't redeclare** — `.pick()`, `.omit()` and `.extend()` on a derived schema.
3. **A route is not done without a test that calls it through the client**, and
   `npm run check` must be green.

### Exercise 1 — Browse the movies

`exercise-1-example-solution` · a couple of hours · all three workspaces

1455 films are in SQLite and nobody can look at one. Build a paginated list and a page per
film. Ignore `plot_embedding` entirely — that is exercise 3's.

- `GET /api/movies` — one page, not the whole table. `page` and `pageSize` with defaults and
  **bounds** (`pageSize=100000` must be refused), plus the total so a pager can draw itself.
  `LIMIT`/`OFFSET` and a `COUNT` in SQL; reading everything then `.slice()` is the wrong answer.
- `GET /api/movies/{id}` — one film, and a declared 404 when the id is unknown.
- Title search, genre filter, sort by IMDb rating. Neither endpoint ever returns
  `plotEmbedding`.
- A card grid with working pagination, and a detail page with plot, cast, crew and awards.
- **Search, filter, sort and page live in the URL**, so page 7 of "Comedy by rating" is a
  link someone else can open. Loading, error and empty states each render something deliberate.

Genres are a JSON column, so "has genre X" is not a plain `=` — look at SQLite's JSON
functions. The genre dropdown needs its own small endpoint. Mantine already has
`Pagination`, `Card`, `SimpleGrid` and `Select`.

**Done when** you can search "alien", sort by rating, land on page 2, click a film and read
about it.

### Exercise 2 — Favourites

`exercise-2-example-solution` · half a day · builds on exercise 1

**Accounts already work.** `main` ships sign-up, sign-in, sign-out and a header — read
`apps/api/src/accounts.ts` first. Sessions are a `Map` in the API process, not a table, so
**restarting the API signs everyone out**. That is deliberate: who is signed in is a fact
about a running process, and a teaching app may lose it.

**The `favourites` table already exists too** — `userId` + `movieId` as a composite primary
key, cascading foreign keys, migration committed. It is empty, and wiring it up is the
exercise. You should not need `npm run db:generate` at all.

- Add and remove a favourite. Favouriting a film that does not exist is a 404; doing it
  while signed out is a 401.
- The composite key makes a duplicate impossible in the database, and
  `onConflictDoNothing()` turns a double-clicked heart into "already done" rather than a 500.
- Every movie in a list says whether the caller has favourited it, and the list gains a
  "favourites only" filter. **Anonymous callers get `false`, not an error.**
- `isFavourite` is computed per request, never stored on the movie — an `.extend()` on the
  derived schema. Think about what it costs on a page of 24 cards: one query, not 24.
- A heart on every card and on the detail page, a favourites page, and a toggle on the list.
  After a mutation, `invalidateQueries` — a `useState` mirror of the server is two truths.

**Done when** you can favourite three films, sign out, sign in as somebody else, see none of
theirs, sign back in and find all three — as long as you have not restarted the API.

### Exercise 3 — Suggestions from the embeddings

`exercise-3-example-solution` · half a day · the most open-ended

Every film carries `plot_embedding`: 1536 floats encoding what its plot is _about_. Similar
plots point in similar directions, and that is **cosine similarity** —
`dot(a, b) / (magnitude(a) * magnitude(b))`. About ten lines. Nothing to install.

- "More like this" on the detail page: the N closest films. A film is never similar to
  itself, and one with no embedding gives an honest empty result rather than a crash.
- A suggestions page from the signed-in user's favourites: build one taste vector, suggest
  the closest films they have **not** favourited, and say which favourite each came from —
  "because you liked _Alien_". No favourites yet gets "favourite something first".
- Return the scores and show them, so the result is inspectable rather than magic.

**No vector database, no API key, no new service.** 1455 vectors is ~9 MB, so scanning all of
them is milliseconds. Decode each **once**, not once per comparison. Do not assume unit
length — divide by the magnitudes, or normalise up front and say so in a comment. Watch for a
zero-magnitude vector: dividing by it gives `NaN`, and `NaN` sorts in a way that will cost
you an hour. Decode with a `Float32Array` view and narrow with `instanceof Uint8Array`;
reaching for `as` means you took a wrong turn. **Embeddings never go to the browser.**

28 of the 1455 films have no embedding. That is not a bug to fix, it is a case to handle.

Test that similarity gives 1 for identical vectors and 0 for orthogonal ones, that a film is
not its own suggestion, that one without an embedding is excluded, and that empty favourites
give an empty list.

**Done when** any film shows plausible neighbours, and three favourites produce a sensible
suggestion that names the favourite it came from.

Finished all three? **[Stretch goals](#the-stretch-goals)** — thirty-odd small, fun
extras, an hour to an afternoon each. No answer branches; you are on your own, which is the
point. Same rules: derive, never duplicate; npm only; `npm run check` green.

<details>
<summary><b>The stretch goals</b> — pick one you would actually use</summary>

**Games**

- **Higher or lower** — two posters, guess which IMDb rates higher. The design problem is
  picking a fair pair.
- **Guess the plot** — a plot with the title and cast redacted. Redaction leaks the answer
  in more ways than you expect.
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
  **shareable top five** in the URL, **favourites export/import**, **published API docs**,
  **a terminal client** over the same typed client, **keyboard navigation**, **an
  accessibility pass**, **skeletons instead of spinners**.

**Under the hood**

- **Add a column the ingest throws away** — the whole schema-to-UI flow in one sitting.
- **Make ingest legible** — progress, a summary, and no redone work.
- **A fixture database** so tests can assert _which_ neighbour comes back.
- **Measure the scan** at 1455 vectors, then at 150,000.
- **Break rule 2, deliberately** — free-text search with a real embedding model, optional
  and honest about it.

</details>

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

New to this stack? Start with the `start-here` skill in `.claude/skills/`, then
`learn-this-stack` — it translates the stack from whatever language you already write, and
tells you what to unlearn. (C#/.NET and Blazor also get a longer guide each.) Full detail
for agents lives in [AGENTS.md](AGENTS.md).

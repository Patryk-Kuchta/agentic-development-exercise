# Exercise 1 — Browse the movies

**Example solution:** branch `exercise-1-example-solution`
**Time:** a couple of hours
**You will touch:** all three workspaces, in the required order

## Goal

`main` gives you 1455 movies in SQLite and a landing page that counts them. Nobody can
_look_ at a movie yet. Build that: a paginated list, and a page per film.

Ignore `plot_embedding` completely. It exists, it is a 1536-number vector, and it is
Exercise 3's problem. You will not send it to the browser.

## What you are given

- `packages/contract/src/schema.ts` — the `movies` table. Already complete. You should not
  need to add a single column.
- `packages/contract/src/zod.ts` — `movieSchema`, which is the table minus the embedding.
  It is exported and currently unused. It is waiting for you.
- `packages/contract/src/contract.ts` — two procedures, `health` and `stats`. Copy their
  shape.
- A working oRPC client in the web app, already wired to React Query.

## Build this

**API**

- [ ] `GET /api/movies` returns one page of movies, not all of them.
  - [ ] Takes `page` and `pageSize`. Both have sane defaults and validated bounds — a
        caller asking for `pageSize=100000` must not get it.
  - [ ] Returns the rows **and** enough metadata to render a pager: at minimum the total
        number of matching movies.
  - [ ] Pagination happens in SQL (`LIMIT`/`OFFSET` plus a `COUNT`). Reading the whole
        table and calling `.slice()` is the wrong answer and will be obvious at review.
- [ ] `GET /api/movies/{id}` returns one movie, and a declared 404 when the id is unknown.
- [ ] Neither endpoint ever returns `plotEmbedding`.
- [ ] Filtering: at least a title search and a genre filter.
- [ ] Sorting: at least by IMDb rating.

**Web**

- [ ] A list page showing a card per movie — poster, title, genres, rating.
- [ ] Working pagination controls.
- [ ] The search, filter, sort and page state live **in the URL**, so a link to page 7 of
      "Comedy sorted by rating" is a link someone else can open.
- [ ] Clicking a card opens a detail page showing the full plot, cast, directors, writers,
      runtime, rating, awards and countries.
- [ ] Loading, error and empty states all render something deliberate.

## Design constraints

These are the point of the exercise, not decoration.

1. **Work in the order in `.claude/skills/add-feature/SKILL.md`**: schema → migration →
   `zod.ts` → `contract.ts` → handler → API test → web. Every step consumes the previous
   one's output. Start in the middle and you will hand-write a type that was about to be
   generated for you.
2. **Do not hand-write a type, a Zod schema, or a `fetch`.** Your list response type is
   derived from `movieSchema`. Your React hook is generated from the contract.
3. **The list does not need every column.** A card does not use `writers`. Derive a summary
   schema from `movieSchema` with `.pick({ ... })` rather than declaring a new object.
4. A new route is not done without a test that calls it through the client.

## Hints

- `movieSchema.pick({ ... })` and `.omit({ ... })` are how you reshape without redeclaring.
- Genres are a JSON column, so "has genre X" is not a plain `=`. Look at SQLite's JSON
  functions, or think about what `LIKE` would do and why it is a bit grubby. Either is an
  acceptable answer here — being able to say why you chose it matters more.
- For the genre dropdown you need the list of distinct genres. That is its own small
  endpoint.
- Mantine has `Pagination`, `Card`, `SimpleGrid`, `Select` and `TextInput`. Check
  `.claude/skills/use-the-library/SKILL.md` before you build any of them yourself.
- React Router's `useSearchParams` is how state gets into the URL.
- 1455 rows is small. Do not build a cache. Do not add an index until a query is slow and
  you have measured it.

## Stretch

- Debounce the search box so every keystroke is not a query.
- Keep the previous page visible while the next one loads, instead of flashing a spinner.
- Handle a `pageSize` that would put `page` past the end.

## Done when

`npm run check` is green, and you can open the app, search for "alien", sort by rating,
land on page 2, click a film, and read about it.

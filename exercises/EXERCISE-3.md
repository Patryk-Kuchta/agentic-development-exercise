# Exercise 3 — Suggest a film, using the embeddings

**Example solution:** branch `exercise-3-example-solution` (built on Exercise 2)
**Time:** half a day
**You will touch:** the column you have been ignoring since Exercise 1

## Goal

Every movie carries `plot_embedding`: 1536 floating-point numbers that encode what its plot
is _about_. Two films with similar plots have vectors that point in similar directions.

Turn that into: "because you liked these, watch this."

This exercise is deliberately the most open-ended, and it is the one to drive hardest with
your AI agent. Point it at the codebase and make it justify its plan before it writes code.

## The one idea you need

A 1536-number vector is a direction in 1536-dimensional space. "How similar are these two
plots" becomes "how close together do these two arrows point", and that is **cosine
similarity**:

```
similarity(a, b) = dot(a, b) / (magnitude(a) * magnitude(b))
```

1.0 means identical direction, 0 means unrelated, negative means opposed. It is about ten
lines of TypeScript. There is no library to install and nothing to run.

## What you are given

- `plot_embedding`, a BLOB of 1536 little-endian float32s — already ingested, already in
  your database.
- `encodeEmbedding` / `decodeEmbedding` in `apps/api/src/embeddings.ts`.
- 28 of the 1455 movies have **no** embedding. That is not a bug to fix; it is a case to
  handle.

## Build this

- [ ] "More like this" on the movie detail page: the N films whose plots are closest to
      this one.
  - [ ] A movie is never similar to itself.
  - [ ] A movie with no embedding gives an honest empty result, not a crash and not a lie.
- [ ] A suggestions page driven by the signed-in user's favourites.
  - [ ] Build one vector representing the user's taste from the films they favourited.
  - [ ] Suggest the closest films they have **not** already favourited.
  - [ ] Each suggestion says which favourite it came from — "because you liked _Alien_".
  - [ ] A user with no favourites gets a clear "favourite something first", not an empty
        grid and not an error.
- [ ] Scores are returned and shown, so the result is inspectable rather than magic.
- [ ] Tests covering: a movie is not its own suggestion; a movie with no embedding is
      excluded; an empty favourites list returns an empty suggestion list; the similarity
      function itself returns 1 for identical vectors and 0 for orthogonal ones.

## Design constraints

1. **No vector database, no API key, no new service.** 1455 vectors is ~9 MB. Comparing a
   query vector against all of them is about two million multiply-adds, which is
   milliseconds. Load them into memory once and scan. Rule 2 still applies.
2. **Do not send embeddings to the browser.** Similarity is computed on the server. The
   browser gets movies and scores.
3. Do not assume the vectors are unit length. Divide by the magnitudes, or normalise once
   up front and say in a comment that you did.
4. Decode the BLOB properly: a `Float32Array` view over the bytes. If you find yourself
   reaching for `as`, you have taken a wrong turn — the repo bans it and there is a clean
   narrowing that works.

## Why there is no free-text search box

The obvious feature is "describe a film and find it". That needs the _query_ turned into a
vector by the same model that made these ones — an API call to an embedding model, with an
API key and a network dependency. That breaks rule 2, which is why this exercise does
film-to-film and taste-vector similarity instead.

If you want to build it anyway, make the model optional, keep the app fully working
without it, and be honest in the README about the new requirement. Knowing where a rule
should bend is worth more than following it.

## Hints

- Decode every embedding once, not once per comparison. Where should that cache live, and
  what invalidates it?
- A taste vector is the average of the vectors you liked — but average the _directions_,
  and normalise the result.
- "Which favourite caused this suggestion" falls out of the scan for free if you track the
  best match as you go.
- Sorting 1455 scores to take the top 10 is fine. If you want to be clever, a bounded
  insert is faster — but measure before you claim it matters.
- Watch out for a zero-magnitude vector. Dividing by it produces `NaN`, and `NaN` sorts in
  a way that will waste an hour of your life.

## Stretch

- Let the user exclude a genre from suggestions.
- Weight recent favourites more heavily.
- "Surprise me": a good film that is _not_ very close to the user's taste, and an argument
  for why that is a better product.
- Measure how long a suggestion takes with 1455 movies, then reason about 1.5 million.

## Done when

`npm run check` is green, you can open any film and see plausible neighbours, and after
favouriting three films the suggestions page recommends something sensible and tells you
which favourite it came from.

# Exercise 2 — Accounts and favourites

**Example solution:** branch `exercise-2-example-solution` (built on Exercise 1)
**Time:** half a day
**You will touch:** the schema for the first time, plus auth on both sides

## Goal

Let a person sign up, sign in, and keep a list of favourite films that is still there when
they come back.

This is where you change `schema.ts` for the first time, so it is really an exercise in
"add two tables and let everything else follow".

## What you are given

Exercise 1's list and detail pages. If you did not finish it, start from
`exercise-1-example-solution`.

## Build this

**Schema**

- [ ] A `users` table — email (unique), display name, and a password that is **not** stored
      in plain text.
- [ ] A `favourites` table joining a user to a movie, with a constraint that makes the same
      person favouriting the same film twice impossible **in the database**, not just in
      the handler.
- [ ] Whatever you need to keep someone signed in across a page reload.
- [ ] Migration generated with `npm run db:generate` and committed in the same commit as
      the schema change. Never hand-write the SQL.

**API**

- [ ] Sign up with an email, a name and a password. Fake emails are fine — nothing is sent.
- [ ] Sign up with an email that already exists fails with a declared error, not a 500.
- [ ] Sign in returns something the browser can present on later requests.
- [ ] "Who am I" endpoint that fails cleanly when the caller presents nothing or junk.
- [ ] Add a favourite, remove a favourite, list my favourites (paginated, like the movies
      list).
- [ ] Favouriting a movie that does not exist is a 404.
- [ ] **A password hash must never appear in any response.** Check this with a test that
      would fail if someone later added the column back to the response schema.
- [ ] The movie list gains a "favourites only" filter, and each movie in a list tells the
      caller whether the signed-in user has favourited it. Anonymous callers get `false`,
      not an error.

**Web**

- [ ] Sign-up and sign-in pages, with validation errors shown per field.
- [ ] The session survives a refresh.
- [ ] A heart (or similar) on every card and on the detail page, which toggles.
- [ ] A dedicated favourites page.
- [ ] A "favourites only" toggle on the main list.
- [ ] Sign out.

## Design constraints

1. **Hash passwords with `node:crypto`'s `scrypt`, with a per-user random salt, and compare
   with `timingSafeEqual`.** `bcrypt` is a native addon and is banned by rule 2 — see
   `.claude/skills/add-dependency/SKILL.md`. If you reach for a JWT library, ask yourself
   first what it buys you over a random token in a table.
2. **The response shape is not the table shape.** `users` has a password hash; the API's
   user object does not. Express that as `.omit()` on the derived schema — never by
   declaring a fresh `z.object`.
3. `isFavourite` is computed per request, not stored on the movie. It is a legitimate
   `.extend()` on a derived schema.
4. Deleting a user should not leave orphaned favourites. That is a foreign key's job.
5. After a mutation the UI must reflect reality. React Query's `invalidateQueries` does
   that; a `useState` mirror of the server does not.

## This is a teaching app

Real authentication also needs rate limiting, email verification, password rules, session
expiry and rotation, CSRF thinking, and a plan for "I forgot my password". You are building
none of that, deliberately. Do not copy this into anything real, and write a comment that
says so.

## Hints

- Read `.claude/skills/change-schema/SKILL.md` before you touch `schema.ts`. Then read the
  generated SQL. It is a real artefact.
- The token has to get from the browser onto every request. The oRPC link takes a `headers`
  option that can be a function, evaluated per request — that is one clean place to put it.
- "Am I signed in" is a piece of React state that lots of components need. That is what
  context is for.
- Favourites + pagination means a join. Drizzle's `innerJoin` types the result for you.
- Think about what `isFavourite` costs on a page of 24 movies. One query, not 24.

## Stretch

- Optimistic favouriting: the heart fills instantly and rolls back if the server refuses.
- Expire sessions, and handle expiry in the browser by bouncing to sign-in.
- Show a favourites count in the header that stays correct after every toggle.

## Done when

`npm run check` is green, and you can sign up as one person, favourite three films, sign
out, sign in as somebody else, see none of their favourites, sign back in as the first
person, and find all three still there.

# Exercise 2 — Accounts and favourites

**Example solution:** branch `exercise-2-example-solution` (built on Exercise 1)
**Time:** half a day
**You will touch:** tables that are already there, plus auth on both sides

## Goal

Let a person sign up, sign in, and keep a list of favourite films that is still there when
they come back.

## What you are given

Exercise 1's list and detail pages. If you did not finish it, start from
`exercise-1-example-solution`.

**The tables already exist, and you are expected to use them.** `packages/contract/src/schema.ts`
declares `users` and `favourites`, and the migration that creates them is already committed
and already applied at boot. Read them before you start — they are the shape of this
exercise:

- `users` — `id`, `email` (unique), `displayName`, `passwordHash`, `createdAt`.
- `favourites` — `userId` + `movieId` as a **composite primary key**, plus `createdAt`.
  Both columns are foreign keys that cascade on delete.

You should not need `npm run db:generate` at all in this exercise. If you find yourself
adding a column, stop and ask whether the thing you are storing really belongs in the
database — see "Where sessions live" below.

## Where sessions live

**In memory, in the API process. Not in a table.**

Keep a `Map` from a random token to a user id. Signing in puts an entry in; signing out
deletes it; asking "who am I" looks one up. That is the whole mechanism, and it is about
fifteen lines.

This is a deliberate choice, and the cost is real: **restarting the API signs everyone out**,
which under `npm run dev` means every time you save a file. That is the trade being taught.
Who is currently signed in is a fact about a running process, not about the catalogue, and a
teaching app is allowed to lose it. A real one would put sessions in Redis or a table and
give them an expiry.

Do not reach for a JWT library. Ask first what it would buy you over a random string in a
`Map` — the answer here is "a signing key, a dependency, and no way to sign anybody out".

## Build this

**API**

- [ ] Sign up with an email, a name and a password. Fake emails are fine — nothing is sent.
- [ ] Sign up with an email that already exists fails with a declared error, not a 500.
- [ ] Sign in returns a token the browser can present on later requests.
- [ ] "Who am I" endpoint that fails cleanly when the caller presents nothing or junk.
- [ ] Sign out, which makes the token stop working.
- [ ] Add a favourite, remove a favourite.
- [ ] Favouriting a movie that does not exist is a 404.
- [ ] **A password hash must never appear in any response.** Check this with a test that
      would fail if someone later added the column back to the response schema.
- [ ] The movie list gains a "favourites only" filter, and each movie in a list tells the
      caller whether the signed-in user has favourited it. Anonymous callers get `false`,
      not an error.

**Web**

- [ ] Sign-up and sign-in pages, with validation errors shown per field.
- [ ] The session survives a refresh — the token goes in `localStorage`, and the app asks
      the API who owns it on load.
- [ ] A heart (or similar) on every card and on the detail page, which toggles.
- [ ] A favourites page.
- [ ] A "favourites only" toggle on the main list.
- [ ] Sign out.

## Design constraints

1. **Hash passwords with `node:crypto`'s `scrypt`, with a per-user random salt, and compare
   with `timingSafeEqual`.** `bcrypt` is a native addon and is banned by rule 2 — see
   `.claude/skills/add-dependency/SKILL.md`. This is the one piece of real security in the
   exercise, and it is about ten lines.
2. **The response shape is not the table shape.** `users` has a password hash; the API's
   user object does not. Express that as `.omit()` on the derived schema — never by
   declaring a fresh `z.object`.
3. `isFavourite` is computed per request, not stored on the movie. It is a legitimate
   `.extend()` on a derived schema.
4. After a mutation the UI must reflect reality. React Query's `invalidateQueries` does
   that; a `useState` mirror of the server does not.

## This is a teaching app

Real authentication also needs rate limiting, email verification, password rules, session
expiry and rotation, CSRF thinking, and a plan for "I forgot my password". You are building
none of that, deliberately. Do not copy this into anything real, and write a comment that
says so.

## Hints

- The token has to get from the browser onto every request. The oRPC link takes a `headers`
  option that can be a function, evaluated per request — that is one clean place to put it.
- Handlers need to know who is calling. oRPC has a per-request context for exactly this;
  read the bearer header once, in `app.ts`, and let every handler receive the result.
- "Am I signed in" is a piece of React state that lots of components need. That is what
  context is for.
- The composite primary key means a duplicate insert is a constraint violation. Drizzle's
  `onConflictDoNothing()` turns that into "already done", which is what a double-clicked
  heart deserves.
- Think about what `isFavourite` costs on a page of 24 movies. One query, not 24.

## Stretch

- Optimistic favouriting: the heart fills instantly and rolls back if the server refuses.
- Show a favourites count in the header that stays correct after every toggle.
- Move sessions into a table, and work out what that buys and what it costs.

## Done when

`npm run check` is green, and you can sign up as one person, favourite three films, sign
out, sign in as somebody else, see none of their favourites, sign back in as the first
person, and find all three still there — as long as you have not restarted the API.

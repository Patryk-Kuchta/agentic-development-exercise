import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { favourites, movies, users } from './schema';

/**
 * Drizzle maps a `mode: 'json'` column to "anything at all", because JSON is
 * anything at all — `createSelectSchema(movies).shape.genres` happily accepts
 * `[1, 2, 3]`. Naming the element type here is a refinement of the derived
 * schema, not a second declaration of the column. See the change-schema skill.
 */
const stringArray = z.array(z.string());

const arrayColumns = {
  genres: stringArray,
  castMembers: stringArray,
  directors: stringArray,
  writers: stringArray,
  countries: stringArray,
  languages: stringArray,
};

/** A movie as it sits in the table: every column except the 6 KiB vector. */
const movieRowSchema = createSelectSchema(movies, arrayColumns).omit({
  plotEmbedding: true,
});

/**
 * Whether the caller has favourited this film.
 *
 * Computed per request, never stored on the movie — the same row is favourited
 * by one person and not by another, so it is not a property of the film. An
 * anonymous caller gets `false` rather than an error.
 */
const viewerFields = { isFavourite: z.boolean() };

/** A movie as the API returns it: the row, plus one per-caller fact. */
export const movieSchema = movieRowSchema.extend(viewerFields);

export type Movie = z.infer<typeof movieSchema>;

/**
 * What a card in the list needs, and nothing more. Picked from the row schema
 * rather than declared, so a column that changes type upstream changes here
 * too — and so `fullplot`, `writers` and the rest are not sent 24 at a time.
 */
export const movieSummarySchema = movieRowSchema
  .pick({
    id: true,
    title: true,
    poster: true,
    genres: true,
    imdbRating: true,
    runtime: true,
    type: true,
    rated: true,
    plot: true,
  })
  .extend(viewerFields);

export type MovieSummary = z.infer<typeof movieSummarySchema>;

/**
 * A film with the similarity that put it there. The score travels with it so
 * the UI can show its working — a recommendation you cannot interrogate is
 * indistinguishable from a guess.
 *
 * Roughly `-1` to `1`, because cosine similarity is signed: two plots can point
 * in opposite directions. Deliberately not bounded here — floating-point
 * arithmetic puts a vector's similarity with itself a hair over 1, and a
 * `.max(1)` would turn that into a 500 on the way out.
 */
export const scoredMovieSchema = z.object({
  movie: movieSummarySchema,
  score: z.number(),
});

/**
 * A suggestion from the user's taste, plus the favourite that pulled it in —
 * "because you liked *Alien*". Built on `scoredMovieSchema` rather than beside
 * it, so the two cannot disagree about what a scored film looks like.
 */
export const suggestionSchema = scoredMovieSchema.extend({
  because: movieSummarySchema,
});

/**
 * The answer to "is this film now one of mine?", which is all a heart needs
 * back from a toggle. The owner is whoever is signed in, so `userId` is not
 * echoed back to the person who just sent it.
 */
export const favouriteSchema = createSelectSchema(favourites)
  .pick({ movieId: true })
  .extend(viewerFields);

/** What a row looks like on the way in. Drizzle types the insert itself. */
export type MovieDraft = typeof movies.$inferInsert;

/**
 * A user as the API returns them.
 *
 * `.omit()` on the derived schema rather than a fresh `z.object`, which is what
 * makes the omission load-bearing: the password hash is excluded *because it is
 * named here*, so putting it back would be a deliberate edit to this line.
 * `apps/api/test/accounts.test.ts` fails if it ever reappears.
 */
export const userSchema = createSelectSchema(users).omit({ passwordHash: true });

export type User = z.infer<typeof userSchema>;

/**
 * Signing up. Note that `password` is not a column — the table stores
 * `passwordHash`, and the two must never be confused. Hence a derived pick of
 * the real columns, extended with the request-only one.
 */
export const signUpSchema = createSelectSchema(users, {
  /* Refinements on derived columns: `text()` alone would accept "" and a 100 KB
     display name, because the table does not care and the API must.

     The email is normalised here because this is the edge — `" Ada@EXAMPLE.com "`
     and `"ada@example.com"` are one person, and nothing downstream should have
     to know that. Trim and case come first, since the padded form is not a
     valid address. */
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  displayName: z.string().trim().min(1).max(60),
})
  .pick({ email: true, displayName: true })
  /* A length floor and nothing else. Real password rules are out of scope. */
  .extend({ password: z.string().min(8).max(200) });

/** Signing in needs the identifier and the secret, and nothing else. */
export const signInSchema = signUpSchema.pick({ email: true, password: true });

/**
 * What a successful sign-up or sign-in hands back: a token to present on later
 * requests, and who the caller now is.
 *
 * The token is not a column anywhere — sessions live in memory in the API
 * process, so this is one of the few shapes in the repo with nothing upstream
 * of it. See `apps/api/src/accounts.ts`.
 */
export const sessionSchema = z.object({
  token: z.string().min(1),
  user: userSchema,
});

export type Session = z.infer<typeof sessionSchema>;

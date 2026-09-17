import { oc } from '@orpc/contract';
import { z } from 'zod';
import {
  movieSchema,
  movieSummarySchema,
  sessionSchema,
  signInSchema,
  signUpSchema,
  userSchema,
} from './zod';

/**
 * The HTTP surface, built from the Zod schemas which were themselves built
 * from the table. This is the last derived artefact: the API handlers and the
 * browser client are both typed by it.
 *
 * Paths here are relative — the Express app mounts the whole contract under
 * `/api`, so `/stats` is served at `/api/stats`.
 */

/** Path parameters arrive as strings, so the id is coerced before it is checked. */
const movieParams = z.object({ id: z.coerce.number().int().positive() });

/**
 * A closed set of sort orders. An open string would let a caller name a column
 * and turn the query builder into an injection surface.
 */
export const movieSortSchema = z.enum(['rating', 'title']);

/**
 * Query strings are strings, so every number is coerced. The `max` on
 * `pageSize` is the point of the whole schema: without it a caller asks for
 * a hundred thousand rows and the server obliges.
 */
const movieListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
  search: z.string().trim().min(1).max(100).optional(),
  genre: z.string().trim().min(1).max(50).optional(),
  sort: movieSortSchema.default('rating'),
});

/** One page of results, plus what a pager needs to draw itself. */
const moviePageSchema = z.object({
  items: z.array(movieSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const contract = {
  health: oc
    .route({ method: 'GET', path: '/health' })
    .output(z.object({ status: z.literal('ok'), database: z.boolean() })),

  stats: oc.route({ method: 'GET', path: '/stats' }).output(
    z.object({
      movieCount: z.number().int(),
      moviesWithEmbedding: z.number().int(),
      /* False on a fresh clone, which is what makes the web app show the
         "run npm run ingest" empty state rather than an empty grid. */
      isIngested: z.boolean(),
    }),
  ),

  /**
   * Accounts. These are already built, so that Exercise 2 is about favourites
   * rather than about re-deriving a sign-up form. None of them can return a
   * password hash: every output is built from `userSchema`, which omits it.
   */
  auth: {
    signUp: oc
      .route({ method: 'POST', path: '/auth/sign-up' })
      .input(signUpSchema)
      .output(sessionSchema)
      /* A taken address is an expected outcome of a sign-up form, so it is a
         declared 409 the browser can show against the field — not a 500. */
      .errors({ CONFLICT: {} }),

    signIn: oc
      .route({ method: 'POST', path: '/auth/sign-in' })
      .input(signInSchema)
      .output(sessionSchema)
      /* One error for "no such email" and "wrong password" together, on
         purpose: telling them apart tells a stranger which addresses exist. */
      .errors({ UNAUTHORIZED: {} }),

    me: oc
      .route({ method: 'GET', path: '/auth/me' })
      .output(userSchema)
      /* Presenting nothing, and presenting junk, are the same answer. */
      .errors({ UNAUTHORIZED: {} }),

    signOut: oc
      .route({ method: 'POST', path: '/auth/sign-out' })
      /* Succeeds even when the caller was not signed in: signing out asks for a
         state, not a transition, and the state is reached either way. */
      .output(z.object({ signedOut: z.literal(true) })),
  },

  movies: {
    list: oc
      .route({ method: 'GET', path: '/movies' })
      .input(movieListQuerySchema)
      .output(moviePageSchema),

    /* Declared before `get` on purpose: `/movies/genres` would otherwise be a
       candidate for `/movies/{id}`, and "genres" is not a number. */
    genres: oc.route({ method: 'GET', path: '/movies/genres' }).output(z.array(z.string())),

    get: oc
      .route({ method: 'GET', path: '/movies/{id}' })
      .input(movieParams)
      .output(movieSchema)
      .errors({ NOT_FOUND: {} }),
  },
};

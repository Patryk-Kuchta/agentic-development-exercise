import { implement } from '@orpc/server';
import { contract, type User } from '@app/contract';
import {
  authenticate,
  createSession,
  createUser,
  deleteSession,
  findUserByToken,
  isEmailTaken,
} from './accounts';
import type { Db } from './db';
import { addFavourite, listFavouriteIds, removeFavourite } from './favourites';
import {
  countMovies,
  countMoviesWithEmbedding,
  findMovie,
  findSummariesByIds,
  listGenres,
  listMovies,
  movieExists,
} from './movies';
import {
  buildTasteVector,
  cosineSimilarity,
  findMostSimilar,
  loadEmbeddings,
  type ScoredMovie,
} from './suggestions';

/**
 * What every handler gets besides its input: the bearer token the caller
 * presented, if any. `app.ts` reads it off the request, so nothing below this
 * line touches an HTTP header — which is what keeps handlers testable.
 */
export interface RequestContext {
  token: string | undefined;
}

const os = implement(contract).$context<RequestContext>();

/**
 * A process that is up but cannot read its own SQLite file is not healthy, so
 * the probe runs a real query against a real table — which also proves the
 * migrations were applied.
 *
 * This is the one place the project's "fail loudly" rule inverts: reporting
 * `database: false` is exactly the loud failure this endpoint exists for, and
 * a health check that 500s tells a monitor less than one that answers.
 */
function isDatabaseReachable(db: Db): boolean {
  try {
    countMovies(db);
    return true;
  } catch {
    return false;
  }
}

/**
 * The implementation of the contract. Argument and return types are checked
 * against it, and its Zod schemas validate inputs before a handler runs, so
 * nothing here re-declares a shape. Handlers stay thin: the queries live in
 * `movies.ts` and `accounts.ts`.
 */
export function createRouter(db: Db) {
  /** Who is asking. No token, a stale one and junk are all the same answer. */
  const viewerOf = (context: RequestContext): User | undefined =>
    findUserByToken(db, context.token);

  /**
   * Turns scored ids into scored movies, keeping the ranking. One query for the
   * whole result rather than one per suggestion.
   */
  const withSummaries = (scored: ScoredMovie[], viewer: number | undefined) => {
    const summaries = findSummariesByIds(
      db,
      scored.map((row) => row.id),
      viewer,
    );
    const byId = new Map(summaries.map((movie) => [movie.id, movie]));

    return scored.flatMap((row) => {
      const movie = byId.get(row.id);
      return movie === undefined ? [] : [{ movie, score: row.score }];
    });
  };

  return os.router({
    health: os.health.handler(() => ({
      /* `as const` keeps the literal the contract's `z.literal('ok')` wants;
         without it the inferred return type widens to `string`. */
      status: 'ok' as const,
      database: isDatabaseReachable(db),
    })),

    stats: os.stats.handler(() => {
      const movieCount = countMovies(db);

      return {
        movieCount,
        moviesWithEmbedding: countMoviesWithEmbedding(db),
        isIngested: movieCount > 0,
      };
    }),

    auth: {
      signUp: os.auth.signUp.handler(({ input, errors }) => {
        if (isEmailTaken(db, input.email)) {
          /* Declared in the contract, so the browser can render it against the
             email field instead of showing "something went wrong". */
          throw errors.CONFLICT({ message: 'That email address is already registered.' });
        }

        /* Signed in immediately: making someone sign up and then sign in again
           is asking them to fill in a form they have just filled in. */
        return createSession(createUser(db, input));
      }),

      signIn: os.auth.signIn.handler(({ input, errors }) => {
        const user = authenticate(db, input.email, input.password);

        if (user === undefined) {
          throw errors.UNAUTHORIZED({ message: 'That email and password do not match.' });
        }

        return createSession(user);
      }),

      me: os.auth.me.handler(({ context, errors }) => {
        const user = viewerOf(context);

        if (user === undefined) {
          throw errors.UNAUTHORIZED();
        }

        return user;
      }),

      signOut: os.auth.signOut.handler(({ context }) => {
        deleteSession(context.token);

        return { signedOut: true as const };
      }),
    },

    movies: {
      list: os.movies.list.handler(({ input, context }) => {
        /* `input` is already parsed, bounded and defaulted by the contract's
           Zod schema, so there is nothing left to validate here. */
        const { items, total } = listMovies(db, input, viewerOf(context)?.id);

        return {
          items,
          page: input.page,
          pageSize: input.pageSize,
          total,
          /* Derived, not stored: the pager needs a count of pages, and the
             only two facts that determine it are already in this response. */
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

      genres: os.movies.genres.handler(() => listGenres(db)),

      get: os.movies.get.handler(({ input, context, errors }) => {
        const movie = findMovie(db, input.id, viewerOf(context)?.id);

        if (movie === undefined) {
          /* `errors` is built from the contract's `.errors({ NOT_FOUND: {} })`,
             so an undeclared status cannot be thrown from here by mistake. */
          throw errors.NOT_FOUND();
        }

        return movie;
      }),

      similar: os.movies.similar.handler(({ input, context, errors }) => {
        if (!movieExists(db, input.id)) {
          throw errors.NOT_FOUND();
        }

        const embeddings = loadEmbeddings(db);
        const query = embeddings.find((row) => row.id === input.id);

        /* 27 of the 1455 films ship without a vector, and `loadEmbeddings`
           leaves those rows out — so "missing from the candidates" is exactly
           "has no vector", and one load answers both questions. There is
           nothing to measure against, so the honest answer is "none" rather
           than a crash or a list of arbitrary films. */
        if (query === undefined) {
          return [];
        }

        /* Excluding the film itself is what stops every "more like this" being
           headed by the film you are already looking at, scoring a perfect 1. */
        const scored = findMostSimilar(
          query.embedding,
          embeddings,
          new Set([input.id]),
          input.limit,
        );

        return withSummaries(scored, viewerOf(context)?.id);
      }),
    },

    suggestions: os.suggestions.handler(({ input, context, errors }) => {
      const viewer = viewerOf(context);

      if (viewer === undefined) {
        throw errors.UNAUTHORIZED();
      }

      /* A set, because every use of it below is a membership test — including
         `findMostSimilar`'s exclusion list, which takes one. An `includes`
         inside a filter over 1455 rows is a scan per row. */
      const favouriteIds = new Set(listFavouriteIds(db, viewer.id));
      const embeddings = loadEmbeddings(db);

      /* Only the favourites that actually carry a vector can vote, and the same
         list is what each suggestion is attributed to below. */
      const favouriteEmbeddings = embeddings.filter((row) => favouriteIds.has(row.id));
      const taste = buildTasteVector(favouriteEmbeddings.map((row) => row.embedding));

      /* No favourites, or none of them with a vector: an empty list, which the
         browser renders as "favourite something first". */
      if (taste === undefined) {
        return [];
      }

      /* Suggesting a film they have already favourited is not a suggestion. */
      const scored = findMostSimilar(taste, embeddings, favouriteIds, input.limit);
      const suggestions = withSummaries(scored, viewer.id);

      const embeddingsById = new Map(embeddings.map((row) => [row.id, row.embedding]));
      const sourceIds = favouriteEmbeddings.map((row) => row.id);
      const sourcesById = new Map(
        findSummariesByIds(db, sourceIds, viewer.id).map((movie) => [movie.id, movie]),
      );

      return suggestions.flatMap((suggestion) => {
        const vector = embeddingsById.get(suggestion.movie.id);

        if (vector === undefined) {
          return [];
        }

        /* "Which favourite caused this" is the one it sits closest to. No seed
           on the reduce: a defined `taste` proves the list is not empty. */
        const nearest = favouriteEmbeddings.reduce((best, row) =>
          cosineSimilarity(vector, row.embedding) > cosineSimilarity(vector, best.embedding)
            ? row
            : best,
        );
        const because = sourcesById.get(nearest.id);

        return because === undefined ? [] : [{ ...suggestion, because }];
      });
    }),

    favourites: {
      add: os.favourites.add.handler(({ input, context, errors }) => {
        const viewer = viewerOf(context);

        if (viewer === undefined) {
          throw errors.UNAUTHORIZED();
        }

        /* Checked before the insert so the caller gets a 404 rather than a
           foreign key violation, which would be a 500 and explain nothing. */
        if (!movieExists(db, input.movieId)) {
          throw errors.NOT_FOUND();
        }

        addFavourite(db, viewer.id, input.movieId);

        return { movieId: input.movieId, isFavourite: true };
      }),

      remove: os.favourites.remove.handler(({ input, context, errors }) => {
        const viewer = viewerOf(context);

        if (viewer === undefined) {
          throw errors.UNAUTHORIZED();
        }

        removeFavourite(db, viewer.id, input.movieId);

        return { movieId: input.movieId, isFavourite: false };
      }),
    },
  });
}

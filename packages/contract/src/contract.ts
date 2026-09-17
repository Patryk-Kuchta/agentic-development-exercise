import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * The HTTP surface, built from the Zod schemas which were themselves built
 * from the table. This is the last derived artefact: the API handlers and the
 * browser client are both typed by it.
 *
 * Paths here are relative — the Express app mounts the whole contract under
 * `/api`, so `/stats` is served at `/api/stats`.
 *
 * Exercise 1 adds the movie routes. `movieSchema` in `zod.ts` is already
 * waiting for them.
 */
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
};

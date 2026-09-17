import express, { type Express, type Request } from 'express';
import { OpenAPIHandler } from '@orpc/openapi/node';
import type { Db } from './db';
import { createRouter } from './router';

const bearerPrefix = 'Bearer ';

/**
 * The one place an HTTP header becomes application data.
 *
 * Handlers are given the token through oRPC's context rather than reaching for
 * the request, so nothing below this file knows that sessions travel in a
 * header at all — which is what lets every route be tested without one.
 */
function bearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;

  if (header?.startsWith(bearerPrefix) !== true) {
    return undefined;
  }

  const token = header.slice(bearerPrefix.length).trim();

  /* "Bearer " with nothing after it identifies nobody, and `''` would be a
     sentinel meaning "no token" — which the absent case already means. */
  return token === '' ? undefined : token;
}

/**
 * Builds the Express application without listening, so tests can mount it on
 * an ephemeral port.
 *
 * There are no hand-written routes. The whole HTTP surface is the oRPC
 * contract, served by one handler mounted at `/api`: a procedure declaring
 * `path: '/stats'` is answered at `/api/stats`, with its Zod schemas doing the
 * validation. Adding an endpoint means editing the contract, never this file.
 */
export function createApp(db: Db): Express {
  const app = express();

  app.use(express.json());

  const handler = new OpenAPIHandler(createRouter(db));

  app.use('/api', async (req, res, next) => {
    const { matched } = await handler.handle(req, res, {
      prefix: '/api',
      context: { token: bearerToken(req) },
    });

    /* An unmatched path is not oRPC's to answer — hand it back to Express so
       it 404s (or hits whatever middleware is mounted after this). */
    if (!matched) {
      next();
    }
  });

  return app;
}

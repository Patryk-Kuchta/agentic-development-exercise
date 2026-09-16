import express, { type Express } from 'express';
import type { Db } from './db';

/**
 * Builds the Express application without listening, so tests can mount it on
 * an ephemeral port. Route handlers are added by `registerRoutes`.
 */
export function createApp(db: Db): Express {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    const [row] = db.all<{ ok: number }>('SELECT 1 AS ok');
    res.json({ status: 'ok', database: row?.ok === 1 });
  });

  return app;
}

import { join } from 'node:path';

/**
 * Resolved relative to this file, not to the working directory, so the API
 * behaves identically under `npm run dev` (cwd = repo root), `vitest`
 * (cwd = apps/api) and a direct `node` invocation from anywhere.
 */
const apiRoot = join(import.meta.dirname, '..');

export const migrationsDir = join(apiRoot, 'drizzle');
export const defaultDatabaseUrl = join(apiRoot, 'data', 'app.db');

import { defineConfig } from 'drizzle-kit';

/**
 * Paths are relative to the REPO ROOT, because every drizzle-kit script in
 * the root package.json runs from there (`npm run db:generate`).
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './packages/contract/src/schema.ts',
  out: './apps/api/drizzle',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? './apps/api/data/app.db',
  },
  strict: true,
  verbose: true,
});

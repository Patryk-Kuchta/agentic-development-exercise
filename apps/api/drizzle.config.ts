import { join } from 'node:path';
import { defineConfig } from 'drizzle-kit';

/** Paths resolve relative to this file, so the scripts work from any directory. */
export default defineConfig({
  dialect: 'sqlite',
  schema: join(import.meta.dirname, '../../packages/contract/src/schema.ts'),
  out: join(import.meta.dirname, 'drizzle'),
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? join(import.meta.dirname, 'data', 'app.db'),
  },
  strict: true,
  verbose: true,
});

import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

/**
 * SQLite through Node's own built-in driver. No native addon, no server,
 * nothing to install. See AGENTS.md, rule 2.
 */
export function createDb(url: string) {
  const client = new DatabaseSync(url);
  client.exec('PRAGMA foreign_keys = ON');
  return drizzle({ client });
}

export type Db = ReturnType<typeof createDb>;

/** Applies any migrations the database has not seen. Safe to call on every boot. */
export function applyMigrations(db: Db, migrationsFolder: string): void {
  migrate(db, { migrationsFolder });
}

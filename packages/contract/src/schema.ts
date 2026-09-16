import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The single source of truth for this application.
 *
 * A field is declared here and nowhere else. The Zod schemas, the API
 * contract, the handler types and the SQL migration are all derived from
 * this table. Never hand-write any of them. See AGENTS.md.
 */
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

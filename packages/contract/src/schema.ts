import { sql } from 'drizzle-orm';
import { blob, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The single source of truth for this application.
 *
 * A field is declared here and nowhere else. The Zod schemas, the API
 * contract, the handler types and the SQL migration are all derived from
 * this table. Never hand-write any of them. See AGENTS.md.
 *
 * The shape mirrors one row of the `MongoDB/embedded_movies` Hugging Face
 * dataset, flattened: its nested `imdb` and `awards` objects become columns,
 * and its string arrays become JSON columns.
 */
export const movies = sqliteTable('movies', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  /* The natural key. The dataset repeats 45 of its 1500 rows, so ingest
     upserts on this column and a clean run lands 1455 movies. */
  imdbId: integer('imdb_id').notNull().unique(),

  title: text('title').notNull(),
  /* 'movie' or 'series'. A union, not an enum — `erasableSyntaxOnly` bans those. */
  type: text('type').notNull(),

  /* Nullable in the dataset, so nullable here. 27 rows have no plot at all. */
  plot: text('plot'),
  fullplot: text('fullplot'),
  poster: text('poster'),
  rated: text('rated'),
  runtime: integer('runtime'),

  /* SQLite has no array type. JSON columns keep the dataset's shape without
     six join tables, which would be the right call in a bigger app. */
  genres: text('genres', { mode: 'json' }).$type<string[]>().notNull(),
  /* 'cast' is a reserved SQL keyword; the column is named around it. */
  castMembers: text('cast_members', { mode: 'json' }).$type<string[]>().notNull(),
  directors: text('directors', { mode: 'json' }).$type<string[]>().notNull(),
  writers: text('writers', { mode: 'json' }).$type<string[]>().notNull(),
  countries: text('countries', { mode: 'json' }).$type<string[]>().notNull(),
  languages: text('languages', { mode: 'json' }).$type<string[]>().notNull(),

  imdbRating: real('imdb_rating'),
  imdbVotes: integer('imdb_votes'),
  metacritic: integer('metacritic'),

  awardsWins: integer('awards_wins').notNull().default(0),
  awardsNominations: integer('awards_nominations').notNull().default(0),
  awardsText: text('awards_text'),

  numMflixComments: integer('num_mflix_comments').notNull().default(0),

  /* 1536 little-endian float32s from OpenAI's ada-002, stored raw: 6 KiB a row
     against roughly 20 KiB as JSON text, and it decodes without parsing.
     Null for the 28 rows the dataset ships without one. Exercise 3 uses it;
     it is never sent to the browser.

     `mode: 'buffer'` is load-bearing. Drizzle's default blob mode is JSON, so
     dropping it hands back a parsed object and quietly destroys the vector. */
  plotEmbedding: blob('plot_embedding', { mode: 'buffer' }),

  ingestedAt: text('ingested_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

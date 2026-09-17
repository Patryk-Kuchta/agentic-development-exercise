import { sql } from 'drizzle-orm';
import { blob, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

/**
 * Someone who can sign in and keep favourites. Exercise 2 fills these two
 * tables; they are declared here, with the migration already generated, so that
 * the exercise is about accounts rather than about drizzle-kit.
 *
 * THIS IS A TEACHING APP. There is no email verification, no password reset and
 * no session expiry. Do not copy this into anything real.
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  /* Unique in the database, not just in the handler: two sign-ups racing on the
     same address would both pass a "does this email exist?" check. */
  email: text('email').notNull().unique(),

  displayName: text('display_name').notNull(),

  /* Never the password itself. Hash it with node:crypto's scrypt — `bcrypt` is
     a native addon and rule 2 bans it. */
  passwordHash: text('password_hash').notNull(),

  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

/**
 * One person favouriting one film. The pair is the primary key, so favouriting
 * the same film twice is impossible in the database rather than merely unlikely
 * in the handler — which is what makes a double-clicked heart harmless.
 *
 * Sessions are deliberately *not* here. Who is currently signed in is a fact
 * about a running process, not about the catalogue, so exercise 2 keeps it in
 * memory and everyone is signed out when the API restarts.
 */
export const favourites = sqliteTable(
  'favourites',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    movieId: integer('movie_id')
      .notNull()
      /* Cascades so that deleting either side never leaves an orphan row. */
      .references(() => movies.id, { onDelete: 'cascade' }),

    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [primaryKey({ columns: [table.userId, table.movieId] })],
);

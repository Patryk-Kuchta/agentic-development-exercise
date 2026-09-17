import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { movies } from './schema';

/**
 * Drizzle maps a `mode: 'json'` column to "anything at all", because JSON is
 * anything at all — `createSelectSchema(movies).shape.genres` happily accepts
 * `[1, 2, 3]`. Naming the element type here is a refinement of the derived
 * schema, not a second declaration of the column. See the change-schema skill.
 */
const stringArray = z.array(z.string());

const arrayColumns = {
  genres: stringArray,
  castMembers: stringArray,
  directors: stringArray,
  writers: stringArray,
  countries: stringArray,
  languages: stringArray,
};

/** A movie as the API returns it: every column except the 6 KiB vector. */
export const movieSchema = createSelectSchema(movies, arrayColumns).omit({
  plotEmbedding: true,
});

export type Movie = z.infer<typeof movieSchema>;

/** What a row looks like on the way in. Drizzle types the insert itself. */
export type MovieDraft = typeof movies.$inferInsert;

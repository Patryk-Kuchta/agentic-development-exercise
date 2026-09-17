import type { MovieDraft } from '@app/contract';
import { encodeEmbedding } from '../embeddings';
import type { DatasetRow } from './dataset';

/**
 * The one place the dataset's vocabulary is translated into ours. Everything
 * downstream speaks `MovieDraft`, which Drizzle infers from the table, so a
 * column rename in `schema.ts` breaks this function and nothing else.
 */
export function toMovieDraft(row: DatasetRow): MovieDraft {
  return {
    imdbId: row.imdb.id,
    title: row.title,
    type: row.type,
    plot: row.plot,
    fullplot: row.fullplot,
    poster: row.poster,
    rated: row.rated,
    runtime: row.runtime,

    genres: row.genres,
    /* The dataset calls this `cast`, which SQL reserves for its own CAST
       expression, so the column — and therefore this property — is renamed. */
    castMembers: row.cast,
    directors: row.directors,
    writers: row.writers,
    countries: row.countries,
    languages: row.languages,

    imdbRating: row.imdb.rating,
    imdbVotes: row.imdb.votes,
    metacritic: row.metacritic,

    /* These three columns are `notNull`: "no awards" really is zero awards,
       unlike a missing rating, which stays null. */
    awardsWins: row.awards.wins ?? 0,
    awardsNominations: row.awards.nominations ?? 0,
    awardsText: row.awards.text,
    numMflixComments: row.num_mflix_comments ?? 0,

    plotEmbedding: row.plot_embedding === null ? null : encodeEmbedding(row.plot_embedding),
  };
}

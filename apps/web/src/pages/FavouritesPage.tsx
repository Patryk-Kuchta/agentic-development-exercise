import { MoviesPage } from './MoviesPage';

/**
 * The favourites page is the movie list with one filter pinned on, so it is
 * the same component rather than a second one that can drift. Search, genre
 * and sort keep working inside it.
 */
export function FavouritesPage() {
  return <MoviesPage favouritesOnly />;
}

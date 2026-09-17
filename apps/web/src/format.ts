/**
 * Display formatting shared by the movie list and the movie detail page.
 *
 * These are here rather than in a component because two pages need them, and
 * because "how long is 142 minutes in words" is a decision worth making once.
 */

/* Locale-aware thousands separators, built once: constructing an Intl formatter
   is the expensive part, formatting with it is not. */
const integerFormatter = new Intl.NumberFormat();

/** `142` -> `"2h 22m"`, `45` -> `"45m"`, `120` -> `"2h"`. */
export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  /* `String(...)` because the lint config refuses implicit number-to-string in a
     template: it is the same rule that stops `${undefined}` reaching the UI. */
  if (hours === 0) {
    return `${String(minutes)}m`;
  }

  if (remainingMinutes === 0) {
    return `${String(hours)}h`;
  }

  return `${String(hours)}h ${String(remainingMinutes)}m`;
}

/**
 * IMDb ratings are out of 10 with one decimal. Pinning the decimal keeps a
 * column of ratings aligned instead of alternating between `7` and `7.4`.
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Vote counts run to seven figures, so they are unreadable unseparated. */
export function formatCount(value: number): string {
  return integerFormatter.format(value);
}

/**
 * Where the session token lives between page loads.
 *
 * `localStorage` rather than a cookie, because the API authenticates with a
 * bearer header and nothing here is server-rendered. It is also the reason the
 * session survives a refresh: the React tree is rebuilt from scratch, and this
 * is the only thing that is not.
 *
 * THIS IS A TEACHING APP. A token in `localStorage` is readable by any script
 * on the page, so a real one would prefer an httpOnly cookie and a CSRF story.
 * See exercises/EXERCISE-2.md.
 */

const storageKey = 'movie-suggester.token';

/** `undefined` rather than `null`, so "signed out" has one spelling in this app. */
export function readToken(): string | undefined {
  return window.localStorage.getItem(storageKey) ?? undefined;
}

export function writeToken(token: string): void {
  window.localStorage.setItem(storageKey, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(storageKey);
}

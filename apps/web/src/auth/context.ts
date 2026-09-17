import { createContext, use } from 'react';
import type { Session, User } from '@app/contract';

/**
 * "Am I signed in" is needed by the header, every movie card, the detail page
 * and two route guards, which is exactly the case context exists for. The
 * alternative is threading a `user` prop through components that do not use it.
 *
 * The context and the hook live in their own file, away from the provider
 * component, because Vite's Fast Refresh only handles a module that exports
 * components *or* values, not both.
 */
export interface AuthState {
  /** `undefined` while loading and when signed out — the UI treats both as "not yet". */
  user: User | undefined;
  /** True only while a stored token is being checked, so the header can wait. */
  isLoading: boolean;
  /** Called by the sign-in and sign-up forms with what the API handed back. */
  signedIn: (session: Session) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth(): AuthState {
  const state = use(AuthContext);

  /* A missing provider is a wiring mistake, not a state to render around. */
  if (state === undefined) {
    throw new Error('useAuth was called outside an <AuthProvider>.');
  }

  return state;
}

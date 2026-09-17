import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { client, orpc } from '../api/client';
import { AuthContext, type AuthState } from './context';
import { clearToken, readToken, writeToken } from './token';

/**
 * Holds the signed-in user for the whole app.
 *
 * The token is React state because it is genuinely client state; the *user* is
 * not, and is never copied into `useState`. It is whatever `GET /auth/me`
 * returns, which is how a refresh restores a session: the token comes back out
 * of `localStorage`, and the server is asked again who owns it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(readToken);

  const meQuery = useQuery(
    orpc.auth.me.queryOptions({
      /* No token, no request: an anonymous visitor should not be firing a
         call that can only ever come back 401. */
      enabled: token !== undefined,
      /* An unauthorized answer is a final answer. Retrying it just delays the
         moment the header admits the person is signed out. */
      retry: false,
    }),
  );

  /* A token the server does not recognise needs no special handling: `me` fails,
     `user` stays undefined, and the header offers to sign in. The stale string
     sits in storage until the next sign-in overwrites it, which costs one
     doomed request per load and saves an effect that syncs two copies of the
     same fact. Restarting the API puts every token in this state. */

  const state: AuthState = {
    user: meQuery.data,
    isLoading: token !== undefined && meQuery.isPending,

    signedIn: (session) => {
      writeToken(session.token);
      setToken(session.token);
      /* Seeding the cache means the header shows the name on this render
         rather than after a round trip that would only return what we hold. */
      queryClient.setQueryData(orpc.auth.me.queryKey(), session.user);
    },

    signOut: () => {
      /* Told to the server so the session row goes away, rather than merely
         forgotten by this browser. A leaked token would otherwise still work. */
      void client.auth.signOut();
      clearToken();
      setToken(undefined);
      /* Everything cached was fetched as somebody. Favourites, hearts and the
         user itself all belong to them, so none of it survives the sign-out. */
      queryClient.clear();
    },
  };

  return <AuthContext value={state}>{children}</AuthContext>;
}

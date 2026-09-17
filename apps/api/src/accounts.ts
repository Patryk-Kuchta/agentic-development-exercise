import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { users, type Session, type User } from '@app/contract';
import type { Db } from './db';
import { hashPassword, isPasswordCorrect } from './passwords';

/**
 * Accounts, and who is currently signed in.
 *
 * Users live in the database. **Sessions do not** — they are a `Map` in this
 * process, so restarting the API signs everyone out. Under `npm run dev` that
 * means every time a file is saved.
 *
 * That is a deliberate trade, not an oversight. Who is signed in is a fact
 * about a running process rather than about the catalogue, and a teaching app
 * is allowed to lose it on restart. A real one would use Redis or a table, and
 * would also need expiry, rotation and rate limiting — none of which are here.
 */

/** Token -> user id. Nothing persists it, and nothing needs to. */
const sessions = new Map<string, number>();

/**
 * The columns a user object may contain. `passwordHash` is absent, which is the
 * point: the hash is not filtered out of a response, it is never selected.
 *
 * The functions below are annotated `User`, a type derived from the table, so a
 * column added to `schema.ts` and forgotten here is a compile error.
 */
const userColumns = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  createdAt: users.createdAt,
};

/** 256 bits from the OS. Long enough that guessing one is not a strategy. */
const tokenBytes = 32;

/* Every `email` below arrives trimmed and lowercased: `signUpSchema` normalises
   it at the edge. Doing it again here would be a second definition of what an
   address is. See `packages/contract/src/zod.ts`. */

function findUserById(db: Db, id: number): User | undefined {
  return db.select(userColumns).from(users).where(eq(users.id, id)).get();
}

/** Starts a session for someone who has just proved who they are. */
export function createSession(user: User): Session {
  /* `base64url`: same entropy as hex, shorter, and safe in an HTTP header. */
  const token = randomBytes(tokenBytes).toString('base64url');
  sessions.set(token, user.id);

  return { token, user };
}

/**
 * Who a token belongs to, or `undefined` if it belongs to nobody. Junk, a token
 * from before the last restart, and no token at all all land here the same way.
 * There is no case where a bad token throws.
 */
export function findUserByToken(db: Db, token: string | undefined): User | undefined {
  if (token === undefined) {
    return undefined;
  }

  const userId = sessions.get(token);

  return userId === undefined ? undefined : findUserById(db, userId);
}

/** Signing out forgets the token, so presenting it again identifies nobody. */
export function deleteSession(token: string | undefined): void {
  if (token !== undefined) {
    sessions.delete(token);
  }
}

export function isEmailTaken(db: Db, email: string): boolean {
  return db.select({ id: users.id }).from(users).where(eq(users.email, email)).get() !== undefined;
}

export interface SignUpDraft {
  email: string;
  displayName: string;
  password: string;
}

/**
 * The caller must have checked `isEmailTaken` first. If two sign-ups race, the
 * unique index on `users.email` rejects the loser — which is why that
 * constraint is in the database and not only in the handler.
 */
export function createUser(db: Db, draft: SignUpDraft): User {
  return db
    .insert(users)
    .values({
      email: draft.email,
      displayName: draft.displayName,
      passwordHash: hashPassword(draft.password),
    })
    .returning(userColumns)
    .get();
}

/**
 * `undefined` for both "no such email" and "wrong password", on purpose: the
 * router turns both into one UNAUTHORIZED, so the sign-in form cannot be used
 * to discover which addresses have accounts.
 */
export function authenticate(db: Db, email: string, password: string): User | undefined {
  const row = db
    .select({ ...userColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (row === undefined) {
    return undefined;
  }

  const { passwordHash, ...user } = row;

  return isPasswordCorrect(password, passwordHash) ? user : undefined;
}

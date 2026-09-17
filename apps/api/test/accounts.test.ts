import { afterEach, beforeEach, expect, it } from 'vitest';
import { users } from '@app/contract';
import { applyMigrations, createDb, type Db } from '../src/db';
import { migrationsDir } from '../src/paths';
import { startTestServer, type TestServer } from './helpers/server';

let db: Db;
let server: TestServer;

beforeEach(async () => {
  db = createDb(':memory:');
  applyMigrations(db, migrationsDir);
  server = await startTestServer(db);
});

afterEach(async () => {
  await server.close();
});

const ada = { email: 'ada@example.com', displayName: 'Ada', password: 'correct horse' };

it('signs a new account in straight away rather than asking them to sign in again', async () => {
  const session = await server.client.auth.signUp(ada);

  expect(session.user).toMatchObject({ email: 'ada@example.com', displayName: 'Ada' });
  expect(session.token.length).toBeGreaterThan(0);
});

it('rejects a second sign-up with the same email as a conflict, not a crash', async () => {
  await server.client.auth.signUp(ada);

  await expect(server.client.auth.signUp(ada)).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('treats an email as the same account whatever its case and spacing', async () => {
  await server.client.auth.signUp(ada);

  await expect(
    server.client.auth.signUp({ ...ada, email: ' Ada@EXAMPLE.com ' }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('signs in with the right password', async () => {
  await server.client.auth.signUp(ada);

  const session = await server.client.auth.signIn({ email: ada.email, password: ada.password });

  expect(session.user.email).toBe('ada@example.com');
});

it('refuses a sign-in with the wrong password', async () => {
  await server.client.auth.signUp(ada);

  await expect(
    server.client.auth.signIn({ email: ada.email, password: 'not the password' }),
  ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
});

it('refuses a sign-in for an email that has no account', async () => {
  await expect(
    server.client.auth.signIn({ email: 'nobody@example.com', password: ada.password }),
  ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
});

it('tells a caller presenting a valid token who they are', async () => {
  const { token } = await server.client.auth.signUp(ada);

  expect(await server.clientFor(token).auth.me()).toMatchObject({ email: 'ada@example.com' });
});

it('fails cleanly when the caller presents nothing', async () => {
  await expect(server.client.auth.me()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
});

it('fails cleanly when the caller presents junk', async () => {
  await expect(server.clientFor('not-a-real-token').auth.me()).rejects.toMatchObject({
    code: 'UNAUTHORIZED',
  });
});

it('stops a token working once its owner signs out', async () => {
  const { token } = await server.client.auth.signUp(ada);
  const signedIn = server.clientFor(token);

  await signedIn.auth.signOut();

  await expect(signedIn.auth.me()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
});

it('succeeds at signing out a caller who was never signed in', async () => {
  await expect(server.client.auth.signOut()).resolves.toEqual({ signedOut: true });
});

it('never stores the password itself', async () => {
  await server.client.auth.signUp(ada);

  const row = db.select({ passwordHash: users.passwordHash }).from(users).get();

  expect(row?.passwordHash).not.toContain(ada.password);
});

it('never includes the password hash in any response', async () => {
  /* Fails the moment someone adds the column back to `userSchema`, wherever a
     user object is returned from. */
  const session = await server.client.auth.signUp(ada);
  const me = await server.clientFor(session.token).auth.me();

  expect(Object.keys(session.user)).not.toContain('passwordHash');
  expect(Object.keys(me)).not.toContain('passwordHash');
});

it('rejects a password shorter than the minimum', async () => {
  await expect(server.client.auth.signUp({ ...ada, password: 'short' })).rejects.toMatchObject({
    code: 'BAD_REQUEST',
  });
});

it('rejects an email that is not an email', async () => {
  await expect(server.client.auth.signUp({ ...ada, email: 'not-an-email' })).rejects.toMatchObject({
    code: 'BAD_REQUEST',
  });
});

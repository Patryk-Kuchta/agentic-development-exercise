import { afterEach, beforeEach, expect, it } from 'vitest';
import { applyMigrations, createDb, type Db } from '../src/db';
import { migrationsDir } from '../src/paths';
import { startTestServer, type TestServer } from './helpers/server';

/**
 * A fresh in-memory database per test, migrated by the same generated SQL the
 * real app runs at boot. Nothing is shared between tests and nothing needs to
 * be running first.
 */
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

it('reports ok when the server is serving', async () => {
  expect((await server.client.health()).status).toBe('ok');
});

it('reports the database as reachable once the migrations have run', async () => {
  expect((await server.client.health()).database).toBe(true);
});

import { createApp } from './app';
import { applyMigrations, createDb } from './db';
import { env } from './env';
import { ingestOnBoot } from './ingest/on-boot';
import { requireSupportedNodeVersion } from './node-version';
import { migrationsDir } from './paths';

/* Before anything touches SQLite: on Node 23 the migrator fails with an error
   that names none of this. */
requireSupportedNodeVersion();

const db = createDb(env.DATABASE_URL);
applyMigrations(db, migrationsDir);

const app = createApp(db);

app.listen(env.PORT, () => {
  console.warn(`api listening on http://localhost:${String(env.PORT)}`);

  /* After listen, never before: the first ingest downloads 1500 rows, and the
     server should be answering requests while that happens. */
  ingestOnBoot(db);
});

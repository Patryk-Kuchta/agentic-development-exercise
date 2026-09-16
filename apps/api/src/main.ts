import { applyMigrations, createDb } from './db';
import { createApp } from './app';
import { env } from './env';
import { migrationsDir } from './paths';

const db = createDb(env.DATABASE_URL);
applyMigrations(db, migrationsDir);

const app = createApp(db);

app.listen(env.PORT, () => {
  console.warn(`api listening on http://localhost:${String(env.PORT)}`);
});

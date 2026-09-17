#!/usr/bin/env node
/**
 * A read-only MCP server over this project's SQLite file.
 *
 * Every SQLite MCP server on npm depends on `sqlite3` or `better-sqlite3`, and
 * both are native addons — banned by Rule 2 in AGENTS.md. So this one is ~150
 * lines over Node's built-in `node:sqlite`, the same driver the API uses.
 *
 * Read-only twice over: the database handle is opened with `readOnly: true`, so
 * SQLite itself rejects a write, and `query` refuses anything that is not a
 * single SELECT before it gets that far.
 *
 * Run it by hand with:  npm run mcp:sqlite
 */
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

/* Same default as apps/api/src/paths.ts, and the same env var, so pointing the
   API at another file points this at the same one. */
const projectRoot = join(import.meta.dirname, '..', '..');
const databaseUrl = process.env.DATABASE_URL ?? join(projectRoot, 'apps', 'api', 'data', 'app.db');

const MAX_ROWS = 200;
/* plot_embedding is 6 KiB of raw float32 per row. Nobody wants that in a
   context window, and a Buffer does not survive JSON.stringify usefully. */
const MAX_CELL_CHARS = 500;

if (!existsSync(databaseUrl)) {
  /* The API creates and migrates the file at boot, so this only ever means
     "the app has never been run". Say so rather than dying on ENOENT. */
  console.error(`No database at ${databaseUrl}. Run \`npm run dev\` once, or set DATABASE_URL.`);
  process.exit(1);
}

const db = new DatabaseSync(databaseUrl, { readOnly: true });

/** SQLite hands back BigInt, Buffer and null-prototype rows. Make them printable. */
function renderCell(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Uint8Array) return `<blob ${String(value.byteLength)} bytes>`;
  if (typeof value === 'string' && value.length > MAX_CELL_CHARS) {
    return `${value.slice(0, MAX_CELL_CHARS)}… (${String(value.length)} chars)`;
  }
  return value;
}

function renderRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, renderCell(v)])),
  );
}

function asText(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

/** One statement, and it has to be a SELECT. Comments are stripped first so
    `-- hi\nDELETE ...` cannot sneak past the prefix check. */
function assertReadOnly(sql) {
  const stripped = sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim()
    .replace(/;\s*$/, '');
  if (stripped.includes(';')) throw new Error('One statement at a time.');
  if (!/^(select|with)\b/i.test(stripped))
    throw new Error('Read-only: only SELECT (or WITH … SELECT) is allowed.');
  return stripped;
}

const server = new McpServer({ name: 'movie-suggester-sqlite', version: '0.1.0' });

server.registerTool(
  'list_tables',
  {
    title: 'List tables',
    description: 'List the tables in the Movie Suggester SQLite database, with their row counts.',
    inputSchema: {},
  },
  () => {
    const tables = db
      .prepare(
        `select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name`,
      )
      .all();
    return asText(
      tables.map(({ name }) => ({
        name,
        rows: Number(db.prepare(`select count(*) as n from "${name}"`).get().n),
      })),
    );
  },
);

server.registerTool(
  'describe_table',
  {
    title: 'Describe table',
    description:
      'Show the columns, types and indexes of one table, plus its CREATE TABLE statement.',
    inputSchema: { table: z.string().describe('Table name, e.g. movies') },
  },
  ({ table }) => {
    const created = db
      .prepare(`select sql from sqlite_master where type = 'table' and name = ?`)
      .get(table);
    if (created === undefined) throw new Error(`No such table: ${table}`);
    return asText({
      table,
      sql: created.sql,
      columns: renderRows(db.prepare(`pragma table_info("${table}")`).all()),
      indexes: renderRows(db.prepare(`pragma index_list("${table}")`).all()),
    });
  },
);

server.registerTool(
  'query',
  {
    title: 'Run a SELECT',
    description: `Run one read-only SELECT against the database. Returns at most ${String(MAX_ROWS)} rows; blob columns are summarised, not dumped.`,
    inputSchema: {
      sql: z.string().describe('A single SELECT (or WITH … SELECT) statement.'),
      params: z
        .array(z.union([z.string(), z.number(), z.null()]))
        .optional()
        .describe('Values for ? placeholders.'),
    },
  },
  ({ sql, params }) => {
    const statement = assertReadOnly(sql);
    const rows = db.prepare(statement).all(...(params ?? []));
    return asText({
      rowCount: rows.length,
      truncated: rows.length > MAX_ROWS,
      rows: renderRows(rows.slice(0, MAX_ROWS)),
    });
  },
);

await server.connect(new StdioServerTransport());

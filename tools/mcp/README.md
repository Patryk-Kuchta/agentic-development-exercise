# MCP servers

Two Model Context Protocol servers, configured at the **repo level** so every
clone and every agent gets them without touching a global config file.

| Server       | Gives an agent                                                   | Started by                                                            |
| ------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `sqlite`     | Read-only SQL against the app's SQLite file                      | `node tools/mcp/sqlite-server.mjs`                                    |
| `playwright` | A real Chromium — click the app, read the DOM, take a screenshot | `npx @playwright/mcp --browser chromium --output-dir .playwright-mcp` |

Both are devDependencies, so `npm install` is the only setup. Playwright also
needs its browser once:

```sh
npx @playwright/mcp install-browser chrome-for-testing
```

Not `npx playwright install chromium` — the MCP server asks for the
`chrome-for-testing` build specifically, and refuses to launch without it.

That is a ~95 MiB download into Playwright's own cache, not a daemon, a service
or a native compile — Rule 2 in [AGENTS.md](../../AGENTS.md) still holds.

## `sqlite` — why it is written here rather than installed

Every SQLite MCP server on npm (`mcp-sqlite`, `mcp-server-sqlite-npx`,
`mcp-sqlite-server`, `@executeautomation/database-server`) depends on `sqlite3`
or `better-sqlite3`. Both are native addons, which AGENTS.md bans. So
[`sqlite-server.mjs`](sqlite-server.mjs) is ~150 lines over Node's built-in
`node:sqlite` — the same driver `apps/api` uses.

Three tools: `list_tables`, `describe_table`, `query`.

It is read-only twice over. The handle is opened with `readOnly: true`, so
SQLite rejects a write itself, and `query` refuses anything that is not a single
`SELECT`/`WITH` before that. Results cap at 200 rows, long strings are trimmed,
and `plot_embedding` comes back as `<blob 6144 bytes>` rather than 6 KiB of
float32 in the context window.

It reads `DATABASE_URL`, falling back to `apps/api/data/app.db` — the same
default as `apps/api/src/paths.ts`. Run `npm run dev` once before using it; the
API is what creates and migrates the file.

Try either server by hand — they speak JSON-RPC over stdin, so this just proves
they boot:

```sh
npm run mcp:sqlite
npm run mcp:playwright
```

## Where each client reads its config

Everything below is committed and uses paths relative to the repo root.

| Client                  | File                    | Key               |
| ----------------------- | ----------------------- | ----------------- |
| Claude Code             | `.mcp.json`             | `mcpServers`      |
| VS Code (Copilot agent) | `.vscode/mcp.json`      | `servers`         |
| Cursor                  | `.cursor/mcp.json`      | `mcpServers`      |
| Zed                     | `.zed/settings.json`    | `context_servers` |
| Gemini CLI              | `.gemini/settings.json` | `mcpServers`      |

`.claude/settings.json` also sets `enableAllProjectMcpServers: true` and
allow-lists the three `mcp__sqlite__*` tools, so Claude Code starts them without
a prompt. Cursor and VS Code still ask once, per their own UI.

### Clients that only read a global config

Some tools have no project-level MCP file. Nothing here writes outside the repo,
so if you use one of these, paste `.cursor/mcp.json`'s two entries into its
config yourself — with absolute paths, since it will not run in the repo root:

| Client                       | Config file                                          |
| ---------------------------- | ---------------------------------------------------- |
| Windsurf (Cascade)           | `~/.codeium/windsurf/mcp_config.json` (`mcpServers`) |
| Codex CLI                    | `~/.codex/config.toml` (`[mcp_servers.<name>]`)      |
| Claude Desktop               | `claude_desktop_config.json` (`mcpServers`)          |
| JetBrains AI Assistant/Junie | Settings → Tools → AI Assistant → MCP                |

## Using them

Ask for facts, not for guesses:

- "How many movies have no `plot_embedding`?" → `sqlite.query`, not a grep of the ingest code.
- "Does the favourites heart actually toggle?" → `playwright`, after `npm run dev`.

The `sqlite` server is for **reading** the database. Schema changes still go
through `packages/contract/src/schema.ts` and drizzle-kit — see
[`change-schema`](../../.claude/skills/change-schema/SKILL.md). An agent that
cannot write SQL through this server is the point, not a limitation.

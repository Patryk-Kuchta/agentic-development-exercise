# Hooks

- `no-infra-hook.sh` — `PreToolUse(Bash)`. Denies docker, docker-compose,
  podman, `brew install`, apt/apt-get, systemctl, pg_ctl, postgres, mysqld,
  redis-server, and minikube, with the npm-only rule as the reason. Also
  allow-lists unchained read-only commands (`ls`, `git diff`, `npm run check`,
  …) so they don't prompt. Deterministic enforcement of a rule the model would
  otherwise only be _asked_ to follow.
- `gate-on-stop.sh` — `Stop`. Runs `npm run check`; on failure prints the output
  to stderr and exits 2, which blocks the turn and feeds the errors back.
  **Opt-in — commented out of `settings.json` by default.**
- `record-permission-request.sh` — `Notification`. Logs to
  `.claude/permission-requests.log` (gitignored), so you can see which prompts
  recur and promote them into `settings.json`.

## The Stop-hook tradeoff

`gate-on-stop.sh` makes it impossible to end a turn on a red gate — the strongest
guarantee available, and worth it for long unattended runs.

It also runs typecheck, lint, prettier, vitest, drizzle-kit and the web build on
**every** turn, including ones that only read files or answer a question. That is
tens of seconds each time.

Enable it by uncommenting the `Stop` block in `.claude/settings.json`. Leave it
off for interactive work and run `npm run check` yourself.

It guards against loops with the `GATE_ON_STOP` sentinel: the hook exits
immediately if the variable is already set, so the `npm run check` it spawns
can't trigger it again.

## Writing hooks here

- Read the payload from stdin with `jq`; exit 0 to stay out of the way.
- `PreToolUse` decisions are
  `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow|deny|ask"}}`,
  plus `permissionDecisionReason` on a deny — the reason is shown to the model,
  so make it actionable.
- An `allow` decision bypasses the `deny` list in `settings.json`. Only
  allow-list commands with no shell metacharacters.
- Exit 2 from a `Stop` hook blocks the turn and feeds stderr back to the model.
- Check syntax with `bash -n <file>` and keep them `chmod +x`.

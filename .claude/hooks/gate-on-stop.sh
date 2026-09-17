#!/usr/bin/env bash
# Stop: block the turn unless the gate (`npm run check`) is green.
# Opt-in — see README.md. Slow: it runs the full gate on every turn.
[ -n "${GATE_ON_STOP:-}" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f package.json ] || exit 0

if ! output="$(GATE_ON_STOP=1 npm run check 2>&1)"; then
  printf '%s\n' "$output" >&2
  echo "" >&2
  echo "\`npm run check\` failed. Fix the errors above before finishing. Do not silence them with \`as\`, \`!\`, \`any\`, or \`eslint-disable\` — see .claude/skills/verify/SKILL.md." >&2
  exit 2
fi

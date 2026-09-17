#!/usr/bin/env bash
# PreToolUse(Bash): deny infrastructure commands. This repo is npm-only.
cmd="$(jq -r '.tool_input.command // empty')"

decide() {
  jq -nc --arg d "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$d}}'
  exit 0
}

deny() {
  jq -nc --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# Command-position match: start of line, or after ; & | ( — catches `a && docker ps`.
infra='(^|[;&|(])[[:space:]]*(sudo[[:space:]]+)?(docker-compose|docker|podman|apt-get|apt|systemctl|pg_ctl|postgres|mysqld|redis-server|minikube)([[:space:]]|$)'
brew='(^|[;&|(])[[:space:]]*(sudo[[:space:]]+)?brew[[:space:]]+install'

if grep -Eq "$infra" <<<"$cmd" || grep -Eq "$brew" <<<"$cmd"; then
  deny "Blocked by the npm-only rule (AGENTS.md, rule 2): this repo must run with \`nvm use && npm install && npm run dev\` and no Docker, container runtime, daemon, database server, or system package install. SQLite is Node's built-in \`node:sqlite\`. If the task genuinely needs infrastructure, stop and ask the user."
fi

# Allow-list read-only commands, but only when unchained — an allow here bypasses
# the deny rules in settings.json, so anything with shell metacharacters falls
# through to normal permission handling.
case "$cmd" in
  *[\;\&\|\`\$\<\>]*) exit 0 ;;
esac

case "$cmd" in
  ls|ls\ *|pwd|cat\ *|head\ *|tail\ *|wc\ *|file\ *) decide allow ;;
  grep\ *|rg\ *|find\ *) decide allow ;;
  git\ status*|git\ diff*|git\ log*|git\ show*|git\ branch|git\ branch\ -*) decide allow ;;
  node\ --version|npm\ --version|npm\ ls*) decide allow ;;
  npm\ run\ check*|npm\ run\ typecheck*|npm\ run\ lint*|npm\ run\ format:check*) decide allow ;;
  npm\ test*|npm\ run\ test*|npx\ vitest\ run*) decide allow ;;
  npx\ drizzle-kit\ check*|npm\ run\ db:check*) decide allow ;;
esac

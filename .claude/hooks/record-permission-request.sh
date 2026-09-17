#!/usr/bin/env bash
# Notification: log permission requests to .claude/permission-requests.log.
cat >> "${CLAUDE_PROJECT_DIR:-.}/.claude/permission-requests.log"

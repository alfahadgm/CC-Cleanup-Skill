#!/bin/sh
# PreToolUse hook (see hooks.json). While a /cleanup run is in progress in this project, it blocks
# git push, git clean, and git reset --hard. Exit 2 tells Claude Code to block the command.
[ -e "${CLAUDE_PROJECT_DIR:-.}/.cleanup/state" ] || exit 0
# Claude Code also sends commands it can't parse (anything with $?, for one) through the "if" filters
# in hooks.json, so check the command text itself. The hook input arrives as JSON on stdin.
grep -Eq 'git( +-[^ ]+)* +(push|clean)([^[:alnum:]_-]|$)|git( +-[^ ]+)* +reset( +[^ ]+)* +--hard' || exit 0
echo "A /cleanup run is in progress in this repo. It never pushes, cleans, or hard-resets. Finish the run, or delete .cleanup/ to abandon it." >&2
exit 2

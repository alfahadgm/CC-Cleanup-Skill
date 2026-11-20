#!/bin/sh
# PreToolUse hook (see hooks.json), active only while a /cleanup run is in progress in this repository.
# It blocks git push, git clean, and git reset --hard, and a commit message in which a decision's option
# lost its advantage or disadvantage. Exit 2 tells Claude Code to block the command.
dir=${CLAUDE_PROJECT_DIR:-.}
# The state folder is at the repository root, which can be above the folder Claude Code was started in.
root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || root=$dir
[ -e "$root/.cleanup/state" ] || exit 0
# Claude Code also sends commands it can't parse (anything with $?, for one) through the "if" filters
# in hooks.json, so check the command text itself. The hook input arrives as JSON on stdin. Only its
# "command" value counts: a description that mentions git push must not block an innocent command.
input=$(cat)
command=$(printf '%s' "$input" | sed -nE 's/.*"command" *: *"((\\.|[^"\\])*)".*/\1/p')

# The commit message is the only record of a decision, and the user decides from each option's advantage
# and disadvantage. Real runs dropped them while copying, so every option line is checked for both.
whole='
  { sub(/\r$/, "") }
  /^ *[A-Za-z][A-Za-z ]*:$/ { on = ($0 ~ /^ *Needs decision:$/); next }
  on && /^ *Option [0-9]+: / && $0 !~ /Advantage: .+Disadvantage: ./ { bad = 1 }
  END { exit bad }'
lost() {
  echo 'A decision in the commit message lost part of an option. Under "Needs decision:", every "Option N:" line must end with "Advantage: ..." and then "Disadvantage: ...", "Leave as is" included. Copy each decision exactly as the workflow returned it, then commit again.' >&2
  exit 2
}
# The message can be in the command itself: a heredoc writes the file only after this hook has run.
printf '%s' "$command" | awk '{ gsub(/\\r/, ""); gsub(/\\n/, "\n"); print }' | awk "$whole" || lost
# Otherwise it is in the file, unless this command carries the message or is about to overwrite the file.
case $command in
*.cleanup/message*)
  printf '%s' "$command" | grep -Eq '> *[^ ;&|]*\.cleanup/message|Needs decision:' ||
    { [ -f "$root/.cleanup/message" ] && ! awk "$whole" "$root/.cleanup/message" && lost; }
  ;;
esac

# Between "git" and its verb there can be flags, and global options that take a separate value (-C <path>).
# shortcut: a value with a space in it (-C "my repo") isn't recognized, parse the arguments if that ever matters.
printf '%s' "${command:-$input}" | grep -Eq 'git( +(-[Cc]|--git-dir|--work-tree|--namespace) +[^ ]+| +-[^ ]+)* +((push|clean)([^[:alnum:]_-]|$)|reset( +[^ ]+)* +--hard)' || exit 0
echo "A /cleanup run is in progress in this repo. It never pushes, cleans, or hard-resets. Finish the run, or delete .cleanup/ to abandon it." >&2
exit 2

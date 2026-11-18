#!/usr/bin/env bash
# Runs /cleanup over a fresh copy of test/fixture with nobody at the keyboard, then checks the result.
#
#   bash test/run.sh                     all 12 steps
#   bash test/run.sh dead-code naming    only those steps
#
# This spends real tokens. CLEANUP_BUDGET_USD caps the spend (default 25).
# CLAUDE_FLAGS adds flags to the claude call, for example CLAUDE_FLAGS="--model sonnet".
set -uo pipefail

# Everything is in one function so bash reads the whole file before it starts.
# Editing a script while bash runs it line by line makes it execute garbage.
main() {
  local repo work result
  repo=$(cd "$(dirname "$0")/.." && pwd)
  work=$(mktemp -d)
  result=$(mktemp)
  cp -r "$repo/test/fixture/." "$work"
  cd "$work" || exit 1
  git init -q && git add -A && git commit -qm baseline || exit 1
  echo "Running /cleanup $* in $work"

  # Without the 0, a non-interactive run drops a background workflow after 10 idle minutes.
  # shellcheck disable=SC2086
  CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude -p "/cleanup:cleanup $*" \
    --plugin-dir "$repo" --permission-mode auto --allowedTools "Workflow(cleanup:cleanup-step)" --output-format json \
    --max-budget-usd "${CLEANUP_BUDGET_USD:-25}" ${CLAUDE_FLAGS:-} > "$result"
  echo "claude exited with $? after $((SECONDS / 60)) min; full result in $result"

  node -e '
    const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
    console.log(`cost: $${Number(r.total_cost_usd).toFixed(2)}   error: ${r.is_error}`)
    for (const d of r.permission_denials || []) console.log("denied:", d.tool_name, JSON.stringify(d.tool_input).slice(0, 160))
    console.log("\n" + r.result + "\n")
  ' "$result"

  bash "$repo/test/check.sh"
}
main "$@"

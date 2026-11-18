#!/usr/bin/env bash
# Checks a /cleanup run over a copy of test/fixture. Run it from the root of that copy.
# One line per planted problem:
#   ok    the problem is fixed
#   ASK   the run left it as a decision for the user (it couldn't ask, or the user said leave it)
#   FAIL  neither; after a partial run, the steps you skipped show up here
git rev-parse --git-dir >/dev/null 2>&1 || { echo 'Run this inside the cleaned copy of the fixture (a git repo).'; exit 2; }

fail=0
# The lines under "Needs decision:" and "Left as is:" in the run's commit messages.
decisions=$(git log --format=%b | awk '/^(Needs decision|Left as is):$/ { on = 1; next } /^[A-Za-z][A-Za-z ]*:$/ { on = 0 } on')

# check <label> <command that succeeds when the problem is gone> [<regex that names the problem in a decision>]
check() {
  if eval "$2" >/dev/null 2>&1; then echo "ok    $1"
  elif [ -n "${3:-}" ] && echo "$decisions" | grep -qiE "$3"; then echo "ASK   $1"
  else echo "FAIL  $1"; fail=1
  fi
}

check 'tests pass'                                  'npm test'
check 'repo-docs: README names no missing script'   '! git grep -q "start:dev" -- README.md'             'start:dev'
check 'repo-docs: .gitignore covers node_modules'   'git grep -q node_modules -- .gitignore'             'gitignore'
check 'dead-code: unused export is gone'            '! git grep -q formatLegacyInvoice'                  'formatLegacyInvoice|legacy\.js'
check 'tests: no skipped test'                      '! git grep -q "test\.skip"'                         'skip'
check 'business-logic: a cancelled order stays put' '! git grep -qE "cancelled: \[.shipped.\]"'          'cancelled'
check 'security: secret is out of the code'         '! git grep -q fixture-secret-9f3a7c21d4'            'API_KEY|secret'
check 'error-handling: no swallowed error'          '! git grep -qE "catch \(e\) \{\}"'                  'catch|swallow'
check 'simplify: one roundToCents'                  '[ "$(git grep -hE "function roundToCents" | wc -l)" -le 1 ]' 'roundToCents'
check 'patterns: one async style'                   '! git grep -qF ".then(" -- src'                     '\.then|async'
check 'naming: one name for the user id'            '! git grep -qw uid -- src'                          '\buid\b'

echo
git log --format='%h %s' | grep 'cleanup(' || { echo 'FAIL  no cleanup(<id>) commits'; fail=1; }
exit $fail

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code plugin, and its own one-plugin marketplace, that provides `/cleanup:cleanup`: a 12-step codebase cleanup where each step runs as a dynamic workflow of subagents and becomes one commit on a `cleanup/<date>` branch in the target repo. Most of the "code" is prompts. There is no build step and no root `package.json`.

## Commands

```sh
node test/step-workflow.test.mjs    # the only automated test: needs no agents, costs nothing
claude plugin validate . --strict   # plugin and marketplace manifests
claude --plugin-dir .               # try the plugin in a session without installing it

# A real unattended run over a copy of test/fixture. Spends tokens.
CLAUDE_FLAGS="--model sonnet --setting-sources project" bash test/run.sh dead-code naming
bash test/run.sh                    # all 12 steps (about 9 min and $2.70 on Sonnet 5.5)
```

- `test/step-workflow.test.mjs` is one file of assert blocks with no runner, so there is no way to select a single test. It covers the workflow script (against stubbed `agent`, `parallel`, `pipeline`), `hooks/guard.sh`, the manifests, and the size of `SKILL.md`.
- `test/run.sh` takes the same arguments as the skill. `CLEANUP_BUDGET_USD` caps the spend (default 25). `--setting-sources project` keeps your own plugins and settings out of the run. It ends by running `test/check.sh`, which prints `ok`, `ASK` (left as a decision), or `FAIL` per planted problem.
- CI (`.github/workflows/ci.yml`) runs only the node self-check.

## Architecture

Three layers, each a different kind of file:

1. **Conductor**: `skills/cleanup/SKILL.md`. It runs in the user's main session: preflight, one workflow per step, the project's checks, the commit, then the next step.
2. **Workflow script**: `workflows/cleanup-step.js`. One script for every step, launched by name as `cleanup:cleanup-step`. It runs Inventory (steps 7 to 10 only), Find per slice, Verify, and Fix, and never runs the full check suite.
3. **Agents**: every agent prompt is built by the script from `rules.md`, the step's file under `steps/`, and the project brief, all passed in as text through `args`.

Things that span files and must change together:

- **The `args` and return contract.** `SKILL.md` step 2 lists the `args` it passes (`rules`, `step`, `brief`, `base`, `checks`, `untracked`, `scope`, `baseline`, `earlier`, `slices`, `inventory`, `trustChecks`) and the fields it gets back (`applied`, `notApplied`, `decisions`, `untrack`, `env`, `rotate`, `renamed`, `canon`). The script reads and returns exactly those.
- **Commit messages are the run's database.** A step is done when its `cleanup(<id>):` commit exists. The section names in the commit template (`Needs decision:`, `Not applied:`, `Renamed:`, `Set env:`, `Rotate:`, `Left as is:`) are read back by later steps, by step 11, by docs-sync, and by `test/check.sh`.
- **Run state.** The conductor keeps `state`, `untracked`, `brief`, `checks.log`, and `message` in a self-ignoring `.cleanup/` folder at the target repo's root. `hooks/guard.sh` treats the existence of `.cleanup/state` as "a run is in progress".
- **The fixture and its checks.** Each planted problem in `test/fixture/` has one line in `test/check.sh`. The fixture is test data: its swallowed error, fake secret, skipped test, and so on are deliberate, so don't fix them.

## Constraints that aren't visible in the code

- **`SKILL.md` must stay under 18,000 bytes.** After compaction Claude Code keeps only the first 5,000 tokens of an invoked skill, and a 12-step run is long enough to be compacted. The test enforces the limit.
- **Workflow scripts are restricted JavaScript.** `export const meta` must be the first statement and a pure literal. No imports, no filesystem, no `Date.now()` or `Math.random()`. `agent()` returns `null` when stopped and throws when it stalls out; the script must survive both. The test runs the script body as an async function with stubbed globals, so a new global used in the script needs a stub there.
- **Hook `if` filters are not exact.** Claude Code also sends commands it can't parse (anything containing `$?`, for example) through the `if` filters in `hooks/hooks.json`. `guard.sh` therefore re-checks the command text from stdin. Trusting `if` alone blocked every `npm test > log; echo $?` during a run.
- **State doesn't go in `.git/`.** It's a protected path, so every write there prompts the user. The state files have no extension so the target project's formatters and linters skip them.
- **Prompt changes need a real run.** The self-check proves the script's logic, not that a model follows the prose. Rules in `SKILL.md` that look redundant ("run every step through the workflow, however small the repo", "never skip a step because you expect it to find nothing") are there because real runs did exactly those things without them.
- **Don't edit the repo while `test/run.sh` is running.** The run loads the plugin from this folder and reads `rules.md` and the step files as it goes.
- **Line endings are LF everywhere** (`.gitattributes`). `guard.sh` and the bash tests break with CRLF.
- **This file lives in `.claude/`, not at the root.** A `CLAUDE.md` at the plugin root makes `claude plugin validate --strict` fail.

## Conventions

- The skill, rules, and step files share one voice: short imperative sentences, the reason stated in the same sentence, no emphasis markup beyond bold lead-ins. Match it.
- Agents may only read from git; only the conductor stages and commits. Keep new instructions consistent with that split.
- To release, raise `version` in `.claude-plugin/plugin.json`; installed copies stay on their version until it changes.

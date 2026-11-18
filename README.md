# /cleanup for Claude Code

A Claude Code plugin that fixes a whole codebase in one run. It works through 12 steps, from repo setup and dead code to naming and a final docs sync. Each step is checked against the project's own build, lint, and tests, and becomes one commit on a new `cleanup/<date>` branch. Nothing is pushed: you review the branch and merge it yourself.

## How it works

Every step goes through the same five stages:

1. **Find.** One subagent per slice of the codebase looks for the step's problems. A slice is about 50 source files, so a small repo is a single slice.
2. **Verify.** Different subagents try to disprove each finding. A fix that could change behavior must start with a test that passes on the current code.
3. **Fix.** Fixes that touch the same files go to one agent, and the rest run in parallel.
4. **Check.** Claude runs the project's checks itself. A step may not add a failing check.
5. **Commit.** The step becomes one commit that lists what changed, what couldn't be applied, and what needs your decision.

Changes Claude shouldn't decide alone are collected along the way and put to you at step 11.

## Requirements

- Claude Code with dynamic workflows turned on (on Pro: `/config` → Dynamic workflows). Tested on 2.1.327.
- git. On Windows, use Git for Windows: the safety hook runs through its `sh`.

Ultracode is not needed. With it on, Claude plans extra workflows of its own and the run costs more.

## Install

In Claude Code:

```
/plugin install cleanup --marketplace alfahadgm/CC-Cleanup-Skill
```

That one-step form needs Claude Code 2.1.275 or later. On older versions, run these two instead:

```
/plugin marketplace add alfahadgm/CC-Cleanup-Skill
/plugin install cleanup@cc-cleanup-skill
```

To try it without installing, start Claude Code with `claude --plugin-dir <path to a clone of this repo>`.

If you installed an earlier version by copying a `cleanup` folder into `~/.claude/skills/` or `.claude/skills/`, delete that copy.

## Usage

### Before you start

- Commit or stash your changes. The run stops if tracked files have uncommitted changes. Untracked files are left alone.
- Use auto permission mode if you can. In manual mode, Claude Code asks you to approve the step workflow: choose "Yes, and don't ask again" so it asks only once.
- Add your install, build, lint, and test commands to your allow rules, so the agents don't stop to ask.

### Commands

| Command | What runs |
|---|---|
| `/cleanup:cleanup` | All 12 steps |
| `/cleanup:cleanup dead-code security` | Only those steps, in step order |
| `/cleanup:cleanup from placement` | That step and every step after it |
| `/cleanup:cleanup in packages/api` | All steps, limited to that folder |
| `/cleanup:cleanup dead-code in packages/api` | Any of the above, limited to that folder |

The run starts by creating the `cleanup/<date>` branch and recording which checks already fail. Then it works through the steps without waiting for you, until step 11.

### Resume or abandon a run

- **Resume:** run the command again on the `cleanup/<date>` branch. It continues after the last finished step, with the same steps, checks, and baseline.
- **Abandon:** delete the `.cleanup/` folder and the `cleanup/<date>` branch.

## The 12 steps

| # | id | What it does |
|---|----|---|
| 1 | `repo-docs` | Makes .gitignore, env examples, lockfiles, CI config, and the docs match the code |
| 2 | `dead-code` | Removes code, files, dependencies, and debug leftovers that nothing uses |
| 3 | `tests` | Adds tests for critical flows, and repairs failing and skipped ones |
| 4 | `business-logic` | Fixes state machines and flows with stuck, unreachable, or conflicting states |
| 5 | `security` | Moves secrets to env vars, closes missing auth checks and injection paths, patches vulnerable dependencies |
| 6 | `error-handling` | Fixes swallowed errors, missing failure paths, leaked resources, and suppressions |
| 7 | `simplify` | Inlines needless abstractions, and merges duplicated logic and styling |
| 8 | `patterns` | Moves each job (fetching, state, forms, logging, and so on) to one approach |
| 9 | `placement` | Moves code to the layer and folder the project's own structure calls for |
| 10 | `naming` | Gives each concept one clear name everywhere |
| 11 | `decisions` | Asks you about the changes it won't make on its own, then applies your choices |
| 12 | `docs-sync` | Updates the docs for everything the run moved, renamed, or removed |

When you run only some steps, step 11 still runs, and so does step 12 if the run changed anything.

Performance and accessibility are not covered.

## What you get

**A branch with one commit per step.** This is the log of a run over this repo's test fixture, oldest first:

```
cleanup(repo-docs): add .gitignore, fix README
cleanup(dead-code): unexport internal roundToCents
cleanup(tests): re-enable skipped test, add order tests
cleanup(business-logic): unknown order status throws intended error
cleanup(security): move payments API key to env var
cleanup(error-handling): add timeout and failure paths to chargeCard
cleanup(simplify): share roundToCents between orders and payments
cleanup(patterns): no inconsistent patterns found
cleanup(placement): code placement already sound, no changes
cleanup(naming): consistent names for user id, order transitions, quantity
cleanup(decisions): no decisions applied (could not ask the user)
cleanup(docs-sync): docs already match the code, no changes
```

**Commit messages that say what happened.** Each one lists the changes, plus whichever of these apply: fixes not applied, items that need your decision, renames, env vars to set, and secrets to rotate. The security commit from that run:

```
cleanup(security): move payments API key to env var

Changes:
- src/payments.js: read PAYMENTS_API_KEY from env instead of hardcoded key; throw if unset
- test/payments.test.js: add tests with stubbed fetch
- README.md: document PAYMENTS_API_KEY
Set env:
- PAYMENTS_API_KEY: bearer token for the payments API, read by chargeCard
Rotate:
- PAYMENTS_API_KEY (the old key) found in src/payments.js
```

**Questions at step 11.** Claude asks about the changes it won't make on its own: external contracts (API fields, DB columns, env vars), new dependencies, unclear business rules, and UX changes. In a run with nobody to ask, it leaves them all as they are and lists them.

**A summary in chat at the end.** It covers the check results before and after, what's left, the env vars you now need to set, the secrets you need to rotate, and how to review or undo a step.

## Safety

- **Its own branch.** The run never pushes, merges, or rewrites history.
- **A hook backs that up.** While a run is in progress, the plugin blocks `git push`, `git clean`, and `git reset --hard` in that repo, for Claude and for every subagent.
- **Subagents only read from git.** Claude stages and commits, after running the project's checks itself.
- **No new failures.** Checks that already failed before the run are recorded first and reported at the end. No step may add one.
- **Contracts are yours to change.** API shapes, routes, database schema, env var names, stored keys, and published exports are returned as decisions, not edited.
- **Hands off.** Agents are told never to edit generated or vendored code, existing migrations, or real `.env` files, and never to run anything against production.
- **Secrets.** Agents are told never to print a secret's value or put it in a commit message. Removing a secret from the code doesn't remove it from git history, so the summary lists what to rotate.
- **Run state.** The run keeps its state in a `.cleanup/` folder at the repo root. The folder ignores itself and is deleted when the run finishes.

## Cost

This is a big run: up to 12 workflows, each with several agents. It scales with the repo, because every step starts one Find agent per slice.

For scale, all 12 steps over the six-file test fixture took 9 minutes and about $2.70 with Sonnet 5.5 on Claude Code 2.1.327.

Try a single step (`/cleanup:cleanup dead-code`) or a single folder (`in <path>`) first. On a large codebase Claude Code may show a `Large workflow` warning; it's advisory and doesn't stop the run.

## Development

### Tests

```sh
node test/step-workflow.test.mjs    # workflow script, hook guard, manifests: no agents, no cost
claude plugin validate . --strict   # plugin and marketplace manifests
bash test/run.sh dead-code naming   # a real unattended run over test/fixture; spends tokens
```

`test/run.sh` copies the fixture to a temp folder, runs `/cleanup:cleanup` there with `claude -p`, prints the cost and time, and then runs `test/check.sh`. With no arguments it runs all 12 steps.

- `CLEANUP_BUDGET_USD` caps the spend (default 25).
- `CLAUDE_FLAGS` adds flags to the `claude` call, such as `--model sonnet`.

`test/check.sh` prints one line per problem planted in the fixture:

| Status | Meaning |
|---|---|
| `ok` | The problem is fixed |
| `ASK` | The run left it as a decision for you |
| `FAIL` | Neither. After a partial run, the steps you skipped show up here |

### Repository layout

```
.claude-plugin/
  plugin.json              plugin manifest
  marketplace.json         lets this repo be added as a marketplace
skills/cleanup/
  SKILL.md                 entry point: preflight, step runner, finish
  rules.md                 rules every agent follows
  steps/                   one instruction file per step (01-repo-docs … 12-docs-sync)
workflows/
  cleanup-step.js          the one workflow script every step runs
hooks/
  hooks.json, guard.sh     block push, clean, and hard reset during a run
test/
  step-workflow.test.mjs   checks that need no agents
  fixture/                 a tiny project with one planted problem per step
  check.sh, run.sh         check a run over the fixture; run one unattended
.claude/
  CLAUDE.md                guidance for Claude Code when working on this repo
.github/workflows/
  ci.yml                   runs the self-check on every push and pull request
```

### Releasing

Raise `version` in `.claude-plugin/plugin.json`. Installed copies stay on their version until it changes.

## License

MIT. See [LICENSE](LICENSE).

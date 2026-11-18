# /cleanup for Claude Code

A Claude Code plugin that fixes a whole codebase in one run. It works through 12 steps. Each step runs as a dynamic workflow of subagents, is checked against the project's own build, lint, and tests, and becomes one commit on a new `cleanup/<date>` branch. Nothing is pushed.

## Install
In Claude Code:
```
/plugin install cleanup --marketplace alfahadgm/CC-Cleanup-Skill
```
That one-step form needs Claude Code 2.1.275 or later. On older versions, run `/plugin marketplace add alfahadgm/CC-Cleanup-Skill` and then `/plugin install cleanup@cc-cleanup-skill`.

To try it without installing, start Claude Code with `claude --plugin-dir <path to a clone of this repo>`.

It needs git, and dynamic workflows turned on (on Pro: `/config` → Dynamic workflows). It doesn't need ultracode; with ultracode on, Claude plans extra workflows of its own and the run costs more.

## Run
1. Start Claude Code in the repo. Commit or stash your changes first.
2. Use auto permission mode if you can. In manual mode, Claude Code asks you to approve the step workflow: choose "Yes, and don't ask again" so it asks only once. In either mode, add your install, build, lint, and test commands to your allow rules so the agents don't stop to ask.
3. Run `/cleanup:cleanup`.

Before it changes anything, it checks for uncommitted changes and creates a `cleanup/<date>` branch. Untracked files you already have are left alone.

Other ways to run it:
- `/cleanup:cleanup dead-code security` runs only those steps.
- `/cleanup:cleanup from placement` starts at a step.
- `/cleanup:cleanup in packages/api` limits the run to one folder. It combines with the others: `/cleanup:cleanup dead-code in packages/api`.
- Running it again on the branch of an unfinished run resumes after the last finished step, with the same steps, checks, and baseline.

## Steps
| # | id | What it does |
|---|----|---|
| 1 | repo-docs | Makes .gitignore, env examples, lockfiles, CI config, and the docs match the code |
| 2 | dead-code | Removes code, files, dependencies, and debug leftovers that nothing uses |
| 3 | tests | Adds tests for critical flows, repairs failing and skipped ones |
| 4 | business-logic | Fixes state machines and flows with stuck, unreachable, or conflicting states |
| 5 | security | Moves secrets to env vars, closes missing auth checks and injection paths, patches vulnerable dependencies |
| 6 | error-handling | Fixes swallowed errors, missing failure paths, leaked resources, and suppressions |
| 7 | simplify | Inlines needless abstractions, merges duplicated logic and styling |
| 8 | patterns | Moves each job (fetching, state, forms, logging, and so on) to one approach |
| 9 | placement | Moves code to the layer and folder the project's own structure calls for |
| 10 | naming | Gives each concept one clear name everywhere |
| 11 | decisions | Asks you about the changes it won't make on its own, then applies your choices |
| 12 | docs-sync | Updates the docs for everything the run moved, renamed, or removed |

Performance and accessibility are not covered.

## What you get
- A `cleanup/<date>` branch with one commit per step. Each commit message lists what changed, what couldn't be applied, and what needs your decision.
- At step 11, Claude asks about the changes it won't make on its own: external contracts (API fields, DB columns, env vars), new dependencies, unclear business rules, and UX changes. In a run with nobody to ask, it leaves them all as they are and lists them.
- At the end, a short summary in chat, including any env vars you now need to set and any secrets you need to rotate.
- Step 11 and the summary also run when you run only some steps, and so does docs-sync when the run changed anything.

## Safety
- The run happens on its own branch and never pushes, merges, or rewrites history. While a run is in progress, the plugin's hook blocks `git push`, `git clean`, and `git reset --hard` in that repo, for Claude and for every subagent. The hook needs `sh`, which Git for Windows includes.
- Subagents may only read from git. The conductor stages and commits, after running the project's checks itself.
- No step may add a failing check. Checks that already failed before the run are recorded first and reported at the end.
- The run keeps its state in a `.cleanup/` folder at the repo root. The folder ignores itself and is deleted when the run finishes. To abandon a run, delete `.cleanup/` and the `cleanup/<date>` branch.

## Cost
This is a big run: up to 12 workflows, each with several agents. The run scales with the repo: it is split into slices of about 50 files, and each step starts one Find agent per slice. A repo that fits in one slice gets one.

For scale: all 12 steps over the six-file test fixture took 9 minutes and about $2.70 with Sonnet 5.5 on Claude Code 2.1.327. Try a single step (`/cleanup:cleanup dead-code`) or a single folder (`in <path>`) first. On a large codebase Claude Code may show a `Large workflow` warning; it's advisory and doesn't stop the run.

## Develop and test
```sh
node test/step-workflow.test.mjs    # workflow script, hook guard, manifests: no agents, no cost
claude plugin validate . --strict   # plugin and marketplace manifests
bash test/run.sh dead-code naming   # a real unattended run over test/fixture; spends tokens
```
`test/run.sh` copies the fixture to a temp folder, runs `/cleanup:cleanup` there with `claude -p`, prints the cost and time, and then runs `test/check.sh`, which prints one line per planted problem: `ok` when it's fixed, `ASK` when the run left it as a decision, `FAIL` otherwise. With no arguments it runs all 12 steps; after a partial run, the lines for the steps you skipped fail. `CLEANUP_BUDGET_USD` caps the spend (default 25), and `CLAUDE_FLAGS` adds flags such as `--model sonnet`.

To release, raise `version` in `.claude-plugin/plugin.json`. Installed copies stay on their version until it changes.

## Repository layout
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
```

## License
MIT. See [LICENSE](LICENSE).

# /cleanup for Claude Code

Fixes a whole codebase in one run. Each step runs as its own dynamic workflow (ultracode), the project's checks run after every step, and each step becomes one commit on a new branch. Nothing is pushed.

## Install
```sh
git clone https://github.com/alfahadgm/CC-Cleanup-Skill.git
```
Then copy the `cleanup` folder from the clone:
- For all your projects: to `~/.claude/skills/cleanup/`
- For one project: to `<repo>/.claude/skills/cleanup/`

```sh
# all projects (macOS / Linux / Git Bash)
cp -r CC-Cleanup-Skill/cleanup ~/.claude/skills/cleanup
```

## Repository layout
```
cleanup/
  SKILL.md      entry point: preflight, step runner, finish
  rules.md      rules every agent follows
  steps/        one instruction file per step (01-repo-docs … 12-docs-sync)
```

## Run
1. Start Claude Code in the repo. Commit or stash your changes first.
2. Turn on ultracode: `/effort ultracode`, or start with `claude --effort ultracode`. This needs Claude Code v2.1.203 or later, a model that supports xhigh effort, and dynamic workflows turned on (on Pro: `/config` → Dynamic workflows).
3. Use auto permission mode if you can. With ultracode on, workflows then start without asking. In manual mode, Claude Code asks you to approve each step's workflow, so the run waits for you 12 times. In either mode, add your install, build, lint, and test commands to your allow rules so the agents don't stop to ask.
4. Run `/cleanup`.

Before it changes anything, it checks for uncommitted changes and creates a `cleanup/<date>` branch. Untracked files you already have are left alone.

Other ways to run it:
- `/cleanup dead-code security` runs only those steps.
- `/cleanup from placement` starts at a step.
- Running `/cleanup` again on a `cleanup/*` branch resumes after the last finished step.

## Steps
1 repo-docs, 2 dead-code, 3 tests, 4 business-logic, 5 security, 6 error-handling, 7 simplify, 8 patterns, 9 placement, 10 naming, 11 decisions, 12 docs-sync

## What you get
- A `cleanup/<date>` branch with one commit per step. Each commit message lists what changed, what couldn't be applied, and what needs your decision.
- At step 11, Claude asks about the changes it won't make on its own: external contracts (API fields, DB columns, env vars), new dependencies, unclear business rules, and UX changes.
- At the end, a short summary in chat, including any env vars you now need to set and any secrets you need to rotate.
- Step 11 and the summary also run when you run only some steps.

## Cost
This is a big run: 12 workflows, each with many agents. Try it on a small repo or a single step first (`/cleanup dead-code`). For large codebases, you can raise the workflow size guideline with `/config workflowSizeGuideline=large`.

## License
MIT. See [LICENSE](LICENSE).

---
name: cleanup
description: Fix a whole codebase in one run. Repo and docs setup first, then dead code, tests, business logic, security, error handling, simplification, patterns, placement, and naming, then a docs sync. Applies fixes directly, runs the project's checks after every step, and commits each step on its own branch.
disable-model-invocation: true
argument-hint: "[step ids | from <step-id>]"
---

# Cleanup

Fix this codebase step by step. You apply fixes; you don't write reports. Every step runs as its own dynamic workflow, and you are the conductor between workflows: you check each result, commit it, and start the next step. Don't stop between steps unless this file says to.

Arguments: `$ARGUMENTS`
- empty: run all steps
- one or more step ids (for example `dead-code naming`): run only those, in the order below
- `from <step-id>`: run that step and every step after it

Step 11 (decisions) and Finish always run, even when only some steps were selected. Step 11 runs after the last selected step from 1 to 10 and before docs-sync.

## Steps

| # | id | instructions |
|---|----|---|
| 1 | repo-docs | steps/01-repo-docs.md |
| 2 | dead-code | steps/02-dead-code.md |
| 3 | tests | steps/03-tests.md |
| 4 | business-logic | steps/04-business-logic.md |
| 5 | security | steps/05-security.md |
| 6 | error-handling | steps/06-error-handling.md |
| 7 | simplify | steps/07-simplify.md |
| 8 | patterns | steps/08-patterns.md |
| 9 | placement | steps/09-placement.md |
| 10 | naming | steps/10-naming.md |
| 11 | decisions | steps/11-decisions.md (ask the user first, see below) |
| 12 | docs-sync | steps/12-docs-sync.md |

Paths are relative to `${CLAUDE_SKILL_DIR}`. Every agent follows `${CLAUDE_SKILL_DIR}/rules.md`.

## Preflight (you, before the first workflow)

1. **Git.** If this isn't a git repository, run `git init` and write a .gitignore for the detected stack that covers env files and key files. If source files contain hardcoded secrets, ask the user before the first commit: move them to env vars first (as step 1 does), commit them as they are, or stop. Then commit the current state as the baseline.
2. **Resume?** If the current branch is `cleanup/*` and already has `cleanup(<id>):` commits, this is a resume: skip the steps already committed. The base commit is the parent of the first `cleanup(` commit on the branch.
3. **Clean tree.**
   - Not resuming: if tracked files have uncommitted changes, stop and ask the user to commit or stash them. Then save the untracked files that aren't ignored, apart from this skill's folder, with `git ls-files --others --exclude-standard > .git/cleanup-untracked`. Those files belong to the user: never stage, move, or delete them, and pass the list to every workflow.
   - Resuming: read the list from `.git/cleanup-untracked`. Changes to tracked files and untracked files not on the list come from an unfinished step. Ask the user whether to stash just those paths (`git stash push -u -- <paths>`, recoverable with `git stash pop`) and redo that step, or stop.
4. **Branch.** If not resuming, create and switch to `cleanup/<date>` (date from `date +%F`; add `-2`, `-3` if the name is taken). The commit you branched from is the base; every diff and log in this run is relative to it.
5. **Checks.** Find the commands for install, build, typecheck, lint, format check, and tests: package scripts, Makefile or justfile, pyproject or tox, CI config, README. Install dependencies with the locked command (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, or the stack's equivalent). If that fails because the lockfile is out of sync, use the normal install, and commit the lockfile change with the first step (say so in its message).
6. **Baseline.** Run every check once. Record what passes, what fails, and the names of failing tests. Pre-existing failures aren't regressions, but no step may add a new one.
7. **Announce** in two or three lines: branch, check commands, baseline result, steps to run. Then start the first step without waiting.

## Running one step

1. **Prepare.** Read `rules.md` and the step's file. If the step file asks for earlier `Needs decision:` items, collect them from this run's commits.
2. **Launch one workflow for the step** (ultracode). Pass as `args`: the text of rules.md, the text of the step file, the check commands, the baseline, the user's untracked files, and any earlier items the step asked for. Put the rules and step text in every agent prompt. Phases:
   - **Find.** For steps that need one view of the whole codebase (simplify, patterns, placement, naming), start with one inventory agent that maps the codebase and picks the canonical choices: terms, patterns, shared tokens, target structure. Pass those choices to every slice agent. Then split the codebase into slices (by package, top-level folder, or the step's categories) and run one agent per slice in parallel. Each returns findings as JSON: `files`, `symbols`, `problem`, `fix`, `kind` (`fix` or `decision`), and up to 3 `options` for decisions.
   - **Verify.** Agents that didn't produce the findings try to disprove them, in batches grouped by file or category. For each finding, check: is the problem real; does the fix keep behavior the same, or change only the defect; and if the change could alter behavior, does a test cover it? If no test does, the fix must start by writing one that passes on the current code; add that test file to the finding's `files`. Drop what fails. Merge duplicates.
   - **Fix.** Group verified fixes so that fixes sharing any file (test files included) land in the same group. One agent per group applies its fixes and runs the checks scoped to its files. Split a large group (for example a rename touching many files) into batches that run one after another. Dependency changes run alone, outside the parallel groups: additions and upgrades first, before any group needs them; removals last.
   - **Check.** One agent runs the full check suite, fixes regressions this step caused, and undoes any fix it can't make pass.
   - **Return:** applied fixes, fixes not applied (with reasons), decisions, files to untrack, env vars the user must set, and secrets to rotate.
3. **Blocked fixes.** If agents report fixes that permission checks blocked, try each once yourself in the main session, where the user can see and answer the permission prompt. If it's denied again, list it as not applied.
4. **Verify it yourself.** Run the full check suite in the main session; don't rely on the workflow's summary. Compare with the baseline. If anything newly fails, fix it or revert the change that caused it, then run the checks again. Never commit with a new failure.
5. **Review the diff.** Look at `git diff --stat` and read the riskiest changes. Revert anything that breaks rules.md: a changed contract, an edited generated file, a test deleted or weakened to make checks pass, an edit outside the step's scope, any change to the user's untracked files.
6. **Commit.**
   - Untrack the files the step returned with `git rm --cached` (the files stay on disk).
   - Stage with `git add -u`, then add the new files this step created. Never stage the user's untracked files or this skill's folder.
   - Read `git diff --cached` for secrets and junk (build output, logs, local env files) and unstage them.
   - Commit:
   ```
   cleanup(<id>): <one-line summary>

   Changes:
   - <main change>
   Not applied:
   - <fix>: <reason>
   Needs decision:
   - <file> / <symbol>: <problem> | options: <A>; <B>; leave as is
   Set env:
   - <VAR_NAME>: <what it's for>
   Rotate:
   - <secret name> found in <file>
   ```
   Leave out empty sections. If nothing changed, commit with `--allow-empty` so the history shows the step ran.
7. **Refresh checks.** If the step changed the check setup (a new test runner, changed scripts), detect the check commands again and record a new baseline.
8. **Report progress** in one line (step, files changed, decisions added), then start the next step.

If the Workflow tool isn't available, run the same phases with the Agent tool: parallel subagents for Find and Verify, one subagent per file group for Fix, then one for Check.

## Step 11: decisions

Collect every `Needs decision:` line from this run's commits (`git log <base>..HEAD`). Find each item again in the current code by its symbol, since files may have moved or been renamed since. Drop items that no longer apply and merge duplicates. If none are left, go to the next step.

Ask the user with AskUserQuestion, up to 4 questions per call. Ask about the highest-impact items one per question: name the location and the problem, give up to 3 options from the item, and always add "Leave as is". Group many similar items (such as near-identical colors) into one question with options like "Apply all suggested" and "Leave all as is". Then run step 11 as a workflow with only the chosen options (Verify, Fix, and Check phases), verify it yourself, and commit as `cleanup(decisions): ...`.

## Finish

Run the full check suite one last time. Then tell the user, in chat and not in a file:
- the branch, the number of commits, and that nothing was pushed
- check results before and after the run
- what's left: fixes not applied and decisions left as is
- every `Set env:` item: the variables the user must now set locally and in CI
- every `Rotate:` item: the user must rotate those secrets, because removing them from the code doesn't remove them from git history
- how to review (`git log --oneline <base>..HEAD`, `git diff <base>..HEAD`) and how to undo one step (`git revert <sha>`)

## Rules for you

- Never push, force-push, merge, rewrite history, or delete branches. The user reviews and merges.
- Keep only short summaries in your context. The details live in the commits.
- Run every selected step in order, even when an earlier one found nothing.
- Never edit this skill's own files.

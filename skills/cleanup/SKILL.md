---
name: cleanup
description: Fix a whole codebase in one run. Repo and docs setup first, then dead code, tests, business logic, security, error handling, simplification, patterns, placement, and naming, then a docs sync. Applies fixes directly, runs the project's checks after every step, and commits each step on its own branch.
disable-model-invocation: true
argument-hint: "[step ids | from <step-id>] [in <path>]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git ls-files *) Bash(git rev-parse *) Bash(git switch -c cleanup/*) Bash(git add *) Bash(git commit *) PowerShell(git status *) PowerShell(git diff *) PowerShell(git log *) PowerShell(git show *) PowerShell(git ls-files *) PowerShell(git rev-parse *) PowerShell(git switch -c cleanup/*) PowerShell(git add *) PowerShell(git commit *)
---

# Cleanup

Fix this codebase step by step. You apply fixes; you don't write reports. Every step runs as its own dynamic workflow, and you are the conductor between workflows: you check each result, commit it, and start the next step. Don't stop between steps unless this file says to.

Run every step through the workflow, however small the repo. By running `/cleanup` the user asked for these workflows. The script sizes itself, so a small repo costs a few agents per step, and its independent Verify phase is what makes the fixes safe to commit. Never find or apply a step's fixes yourself.

Arguments: `$ARGUMENTS`
- empty: run all steps
- one or more step ids (for example `dead-code naming`): run only those, in the order below
- `from <step-id>`: run that step and every step after it
- `in <path>`, after any of the above: limit the run to that folder. Slices come only from it, and agents edit only files under it, plus the tests and docs for that code.

Step 11 (decisions) and Finish always run, even when only some steps were selected. Step 12 (docs-sync) also runs whenever the run changed any file, so the docs never trail a partial run. Step 11 runs after the last selected step from 1 to 10 and before docs-sync.

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

## Run state

The run's facts live in files, not in your memory, so they survive a long run and a restart. The state folder is `.cleanup/` at the repository root. It ignores itself: its `.gitignore` holds a single `*`, so git never shows or stages it. Don't keep state inside `.git/`, where Claude Code asks the user to approve every write. Apart from the log, the files have no extension, so the project's formatters and linters skip them:
- `state`: JSON with the base commit, branch, selected steps, scope path, check commands, the baseline, the allowed failures, flaky tests, slices, the step 11 answers, and the last commit a full check run covered
- `untracked`: the user's untracked files, one per line
- `brief`: the project brief every agent gets
- `checks.log`: the output of the latest check run

Read `state` at the start of every step and write it whenever one of those facts changes. Finished steps aren't in it: a step is done when `<base>..HEAD` has its `cleanup(<id>):` commit.

After a long run the conversation is compacted, and the end of this file can be cut off. If you can't see its last section, "Rules for you", read `${CLAUDE_SKILL_DIR}/SKILL.md` again.

## Preflight (you, before the first workflow)

1. **Git.** If this isn't a git repository, run `git init` and write a .gitignore for the detected stack that covers env files and key files. If source files contain hardcoded secrets, ask the user before the first commit: move them to env vars first (as step 5 does), commit them as they are, or stop. Then commit the current state as the baseline.
2. **Resume?** If `.cleanup/state` exists and names the current branch, this is a resume. Take everything from the state folder, skip the steps that already have a commit, and skip preflight steps 4 to 8. Arguments given now replace the saved selection; with none, the saved selection stands. If it names another branch, ask the user: switch to that branch and resume, or delete the state folder and start fresh.
3. **Clean tree.**
   - Not resuming: if tracked files have uncommitted changes, stop and ask the user to commit or stash them. Then create `.cleanup/` with its `.gitignore`, and after that save the untracked files that aren't ignored with `git ls-files --others --exclude-standard > .cleanup/untracked` (use the Bash tool, so the file is plain UTF-8). Those files belong to the user: never stage, move, or delete them, and pass the list to every workflow.
   - Resuming: changes to tracked files, and untracked files not in `untracked`, come from an unfinished step. Ask the user whether to stash just those paths (`git stash push -u -- <paths>`, recoverable with `git stash pop`) and redo that step, or stop.
4. **Branch.** Create and switch to `cleanup/<date>` (today's date as YYYY-MM-DD; add `-2`, `-3` if the name is taken). The commit you branched from is the base; every diff and log in this run is relative to it. Write `state` now, with the base, branch, selected steps, and scope.
5. **Checks.** Find the commands for install, build, typecheck, lint, format check, and tests: package scripts, Makefile or justfile, pyproject or tox, CI config, README. Install dependencies with the locked command (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, or the stack's equivalent). If that fails because the lockfile is out of sync, use the normal install, and commit the lockfile change with the first step (say so in its message).
6. **Brief.** Launch one agent to write `.cleanup/brief`, 60 lines of Markdown at most; it runs while you do the baseline. It holds the stack and package layout; the project's conventions (folder layout, dominant patterns, existing helpers, styling approach, error style, naming, test style), each with one example path; the generated and vendored paths; and the slices. A slice is a package or folder that one agent can read in full, about 50 source files or 8,000 lines: split bigger folders and merge tiny ones. A repo that fits in one slice gets one. With `in <path>`, slice only that folder. The agent returns the slices (name, paths, file count); save them in `state`. If the repo has about 50 source files or fewer, write the brief yourself instead; this is the only shortcut a small repo gets.
7. **Baseline.** Run every check once, with output sent to `.cleanup/checks.log`. Run the failing tests a second time: the ones that pass on the retry are flaky. Record which checks pass, the names of the failing tests, and the flaky ones. Pre-existing failures aren't regressions, but no step may add a new one. The baseline never changes; it's the "before" in the final report. The allowed failures start as a copy of it and only shrink.
8. **Announce** in two or three lines: branch, check commands, baseline result, number of slices, steps to run. Then start the first step without waiting.

## Running one step

1. **Prepare.** Read `state`, `brief`, `rules.md`, and the step's file. Collect the `Needs decision:`, `Not applied:`, and `Renamed:` lines from this run's commits (`git log <base>..HEAD`). Every step gets them, so agents don't raise an item twice or apply something an earlier step deferred.
2. **Launch the step's workflow**: call Workflow with `name` set to `cleanup:cleanup-step` and these `args`, as a JSON object and not a string:
   - `rules`, `step`, `brief`: the text of those three files, word for word
   - `base`, `checks`, `untracked`, `scope`: from the state folder
   - `baseline`: the allowed failures and the flaky tests
   - `earlier`: the lines you collected in Prepare
   - `slices`: the slices from `state`. For decisions, pass one item per chosen decision instead. For docs-sync, leave it out; one agent is enough.
   - `inventory`: true for simplify, patterns, placement, and naming, which need one view of the whole codebase before the work is split
   - `trustChecks`: true when the checks include a typecheck or a compile step

   Don't write your own script. If that name isn't found, pass `scriptPath` `${CLAUDE_PLUGIN_ROOT}/workflows/cleanup-step.js` instead. If Workflow can't load that path either, read the file and pass its text as `script` once; the result names a saved copy to use as `scriptPath` from then on.

   The script runs these phases:
   - **Inventory**, when asked: one agent makes the step's canonical choices (terms, patterns, shared tokens, target structure), and every Find agent gets them.
   - **Find.** One agent per slice returns findings. If nothing is found, the workflow ends here.
   - **Verify.** Agents that didn't produce the findings try to disprove them, slice by slice as each Find finishes. A fix that could alter behavior with no test covering it must start by writing a test that passes on the current code. With `trustChecks`, fixes that the compiler would catch skip this phase.
   - **Fix.** Fixes that share a file go to the same agent, and the groups run in parallel. Dependency additions and upgrades run alone first; removals run alone last.

   It returns `applied`, `notApplied`, `decisions`, `untrack`, `env`, `rotate`, `renamed`, and `canon`. It doesn't run the full check suite; you do, once, in step 4.
3. **Blocked fixes.** For each `notApplied` item that starts with BLOCKED (a permission check stopped it), try it once yourself in the main session, where the user can see and answer the permission prompt. If it's denied again, list it as not applied.
4. **Check it yourself.**
   - Nothing changed (`git status --porcelain` shows only the user's untracked files): skip to Commit.
   - Only prose docs changed, and nothing that code, the build, or CI reads: run only the checks that cover those files.
   - Otherwise run the full suite, with output sent to `.cleanup/checks.log`. Read the exit codes and the names of failing tests, not the whole log.

   Compare with the allowed failures. A test that newly fails gets one rerun; if it then passes, add it to the flaky tests and move on. For a real new failure, launch one agent with `rules.md`, the step file, and the log path. It fixes the regression that this step's uncommitted changes caused, or reverses the fix that caused it. Then run the checks again. After two failed rounds, discard the step's changes to the files involved (`git restore`, and delete the new files those fixes created), list those fixes as not applied, and run the checks again. Never commit with a new failure.

   When an allowed failure now passes, remove it from the allowed failures, so no later step can bring it back.
5. **Review the diff.** Look at `git diff --stat` and read the riskiest changes. Revert anything that breaks rules.md: a changed contract, an edited generated file, a test deleted or weakened to make checks pass, an edit outside the step's scope, any change to the user's untracked files.
6. **Commit.**
   - Untrack the files the step returned with `git rm --cached` (the files stay on disk).
   - Stage with `git add -u`, then add the new files this step created (untracked files that aren't in `untracked`). Never stage the user's untracked files.
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
   Renamed:
   - <old name> to <new name>
   Set env:
   - <VAR_NAME>: <what it's for>
   Rotate:
   - <secret name> found in <file>
   ```
   Leave out empty sections. If nothing changed, commit with `--allow-empty` so the history shows the step ran. Write the message to `.cleanup/message` with the Write tool and commit with `git commit -F .cleanup/message`; a multi-line message quoted in a shell gets mangled.
   - If a pre-commit hook changes files, stage them and commit again. If it rejects the commit, fix what this step caused. If it fails only on things that were already broken, ask the user once whether this run's commits may skip hooks (`--no-verify`) or the run should stop. Never skip hooks on your own.
7. **Refresh the state.**
   - If the step changed the check setup (a new test runner, changed scripts), detect the check commands again, run the new ones, and add what fails to the allowed failures.
   - Append the returned `canon` to `brief` under "Settled in this run". If the step moved or renamed folders, update the brief's paths and the slices.
   - If a full check run covered this commit, record it as the last one that did.
8. **Report progress** in one line (step, files changed, decisions added), then start the next step.

If the Workflow tool isn't available, run the same phases yourself with subagents, using the prompts in `${CLAUDE_PLUGIN_ROOT}/workflows/cleanup-step.js`: parallel subagents for Find and Verify, then one subagent per file group for Fix.

## Step 11: decisions

Collect every `Needs decision:` line from this run's commits (`git log <base>..HEAD`). Find each item again in the current code by its symbol, since files may have moved or been renamed since. Drop items that no longer apply and merge duplicates. If none are left, go to the next step.

Ask the user with AskUserQuestion, up to 4 questions per call. Ask about the highest-impact items one per question: name the location and the problem, give up to 3 options from the item, and always add "Leave as is". Group many similar items (such as near-identical colors) into one question with options like "Apply all suggested" and "Leave all as is". Save the answers in `state` as soon as you have them, so a resume doesn't ask again. If you can't ask, because AskUserQuestion is unavailable or denied as in a non-interactive run, leave every item as is; Finish lists them.

Then run step 11 like any other step, with one slice per chosen decision (the item and the chosen option), and commit as `cleanup(decisions): ...`. List the items the user left alone under `Left as is:` in that commit. If nothing was chosen, skip the workflow but still make that commit, empty.

## Finish

Run the full check suite one last time, unless HEAD is the last commit a full run covered. Then tell the user, in chat and not in a file:
- the branch, the number of commits, and that nothing was pushed
- check results before (the baseline) and after the run
- what's left: fixes not applied and decisions left as is
- every `Set env:` item: the variables the user must now set locally and in CI
- every `Rotate:` item: the user must rotate those secrets, because removing them from the code doesn't remove them from git history
- how to review (`git log --oneline <base>..HEAD`, `git diff <base>..HEAD`) and how to undo one step (`git revert <sha>`)

Then delete the state folder. The run is finished; running `/cleanup` again starts a new one.

## Rules for you

- Never push, force-push, merge, rewrite history, or delete branches. The user reviews and merges.
- Keep only short summaries in your context. The details live in the commits and the state folder.
- Run every selected step in order, each one through the workflow. Never skip a step because you expect it to find nothing: its workflow ends after Find when that's true, and the empty commit records that it ran.
- Never edit this plugin's own files.

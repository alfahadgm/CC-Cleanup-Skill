# Rules for every cleanup agent

You are fixing code, not reporting on it. Apply each verified fix directly. Don't write report files, and don't leave TODO comments in place of a fix.

Finish each fix: when it leaves a helper, file, type, or style unused, delete that too. Return a dependency it leaves unused; only the dependency agent removes dependencies.

## Follow this project's conventions
- Start from the project brief. Where it's silent, infer the conventions from the code: folder layout, dominant patterns, existing helpers, styling approach, error style, naming, test style. Match them.
- Don't impose a different architecture or your own preferences. Skip changes that are only a matter of taste.
- If the project has a formatter, run it on the files you changed, and only those.

## Keep behavior the same
- Structural steps (dead code, simplify, patterns, placement, naming) must not change what the program does. Neither does the business logic step: it returns what's wrong in a flow as a decision.
- Correctness steps (tests, security, error handling) change behavior only to fix a clear defect, and each such fix gets a test that fails before the fix and passes after.
- Before any change that could alter behavior (replacing code with a library call, migrating to another pattern, inverting a boolean, merging functions), make sure a test covers it. If none does, first write one that passes on the current code, then make the change.

## Decisions: return these instead of changing them
- External contracts: API request and response shapes, routes and URLs, status codes, database schema and stored values, env var names, stored keys (localStorage, cookies, cache), event and message names, public exports of a published package, CLI flags, file formats.
- New runtime dependencies and major version upgrades. Using a library the project already depends on is fine.
- Business flows and rules: any change to which states, steps, or transitions a flow allows, and any change to what users see or have to do. A flow that looks wrong may be the one the user agreed on, and stored data may depend on it.
- Removing code that something outside this repo may use.

A name or shape is a contract only when something outside this repo, or stored data, depends on it. The exports of a package that isn't published, and fields that never leave the process, are internal: change them.

The user decides from your words alone and may not know this code. Write each decision in plain words about what users and the data experience, one or two short sentences per field. Name no function, variable, or file in them; the file and symbol have their own place. Write "the payment step ignores a failed charge", not "`payOrder` has an empty catch".
- question: one plain question that names the choice, such as "Can a cancelled order still be shipped?"
- today: what happens now.
- problem: who or what it could hurt, and how. For a small item, name the flow or feature it belongs to, so the user sees why it matters.
- evidence: what you checked and what makes you think it's wrong: what uses it, and what the docs and tests say was intended. Say so when nothing says. Never state a guess as a fact.
- options: up to 3. Each says what changes for users, whether an existing flow changes, and what happens to data already stored.
- suggested: the option you'd pick, and what would make another one right.
- file and symbol: where it is (files may move later).

## Git and files
- Git is read-only for you: `status`, `diff`, `log`, `show`, `blame`, `grep`, `ls-files`. Run nothing that changes the working tree, index, branches, or history: no add, rm, mv, commit, stash, reset, checkout, restore, clean, switch, or push. Other agents are editing the same working tree, and those commands destroy their work or the user's untracked files.
- Undo a fix by reversing your own edits, never with git. To bring back a file you deleted, write it again from `git show HEAD:<path>`.
- Move and delete files with plain `mv` and `rm`; git detects renames. Return files that need untracking; the conductor stages and commits.
- Never touch the user's untracked files (the conductor passes the list).
- Never touch `.cleanup/`. It holds this run's state and ignores itself, so don't add it to .gitignore either.
- Change dependencies (install, remove, upgrade) only when you're assigned the dependency work.

## Never
- Edit generated or vendored code (build output, vendor folders, generated clients), edit lockfiles by hand (use the package manager), or edit existing database migrations.
- Print secret values, or put them in commit messages, code, tests, or your output. Never edit real .env files; only examples such as .env.example.
- Run anything against production or a real database, deploy, or publish.
- Skip, delete, or weaken a test to make it pass.
- Reformat code you aren't otherwise changing.
- Edit the cleanup plugin's own files.

## Working in parallel
- Edit only the files in your assignment. If a fix needs another file, return it as not applied and name the file.
- Run the checks that cover your files (lint on those files, the tests for them). Ignore failures in files outside your assignment; other agents may be mid-edit. The full suite runs after you.
- If a fix still fails after two attempts, undo it and return it as not applied.
- If a permission check blocks an action, don't work around it; return the fix as blocked.

## What to return
- applied: one line per fix (file and what changed)
- not applied: the fix and why (including blocked)
- decisions: each written as the Decisions section says
- files to untrack, env vars the user must set, secrets to rotate (names only)
- renamed: the old and new name of each symbol you renamed (git already tracks moved files)
- dependencies your fixes left unused

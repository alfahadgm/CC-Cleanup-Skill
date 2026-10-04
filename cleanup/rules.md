# Rules for every cleanup agent

You are fixing code, not reporting on it. Apply each verified fix directly. Don't write report files, and don't leave TODO comments in place of a fix.

## Follow this project's conventions
- Infer them from the code: folder layout, dominant patterns, existing helpers, styling approach, error style, naming, test style. Match them.
- Don't impose a different architecture or your own preferences. Skip changes that are only a matter of taste.

## Keep behavior the same
- Structural steps (dead code, simplify, patterns, placement, naming) must not change what the program does.
- Correctness steps (tests, business logic, security, error handling) change behavior only to fix a clear defect, and each such fix gets a test that fails before the fix and passes after.
- Before any change that could alter behavior (replacing code with a library call, migrating to another pattern, inverting a boolean, merging functions), make sure a test covers it. If none does, first write one that passes on the current code, then make the change.

## Decisions: return these instead of changing them
Return each as a decision: file and symbol (files may move later), the problem, and up to 3 options.
- External contracts: API request and response shapes, routes and URLs, status codes, database schema and stored values, env var names, stored keys (localStorage, cookies, cache), event and message names, public exports of a published package, CLI flags, file formats.
- New runtime dependencies and major version upgrades. Using a library the project already depends on is fine.
- Business rules whose intended behavior is unclear, and any change to what users see or have to do.
- Removing code that something outside this repo may use.

## Git and files
- Never run git commands that change the index, branches, or history: add, rm, mv, commit, stash, reset, switch, push. Move and delete files with plain `mv` and `rm`; git detects renames. Return files that need untracking; the conductor stages and commits.
- Never touch the user's untracked files (the conductor passes the list).
- Change dependencies (install, remove, upgrade) only when you're assigned the dependency work.

## Never
- Edit generated or vendored code (build output, vendor folders, generated clients), edit lockfiles by hand (use the package manager), or edit existing database migrations.
- Print secret values, or put them in commit messages, code, tests, or your output. Never edit real .env files; only examples such as .env.example.
- Run anything against production or a real database, deploy, or publish.
- Skip, delete, or weaken a test to make it pass.
- Reformat code you aren't otherwise changing.
- Edit the cleanup skill's own files.

## Working in parallel
- Edit only the files in your assignment. If a fix needs another file, return it as not applied and name the file.
- Run the checks that cover your files (lint on those files, the tests for them). Ignore failures in files outside your assignment; other agents may be mid-edit. The full suite runs after you.
- If a fix still fails after two attempts, undo it and return it as not applied.
- If a permission check blocks an action, don't work around it; return the fix as blocked.

## What to return
- applied: one line per fix (file and what changed)
- not applied: the fix and why (including blocked)
- decisions: file and symbol, problem, options
- files to untrack, env vars the user must set, secrets to rotate (names only)

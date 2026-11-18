# Step 12: Docs sync

The earlier steps deleted, moved, merged, and renamed code. Make the docs match again. Don't audit the docs from scratch; step 1 does that. Chase only what this run changed.

## What changed
- Moved and deleted files: `git diff -M --name-status <base>..HEAD` (the run facts give the base).
- Renamed symbols, new env vars: the `Renamed:` and `Set env:` lines in this run's commit messages (`git log <base>..HEAD`).
- Commands and settings: `git diff <base>..HEAD` on manifests, scripts, CI config, and env examples.

## Fix
- Search the docs for each old path, name, and command, and update every hit: README files, docs folders, CONTRIBUTING, setup guides, architecture notes, agent instruction files (CLAUDE.md, AGENTS.md, and similar), and the code examples inside them. CHANGELOG entries and decision records are history: only fix their broken links.
- If the project has an agent instruction file, add a short line for each convention this run settled (the brief lists them under "Settled in this run") and for the test command if step 3 added one. Don't create a new instruction file.
- Fix the links this run broke.

Done when: no doc mentions a path, name, or command that this run removed or renamed.

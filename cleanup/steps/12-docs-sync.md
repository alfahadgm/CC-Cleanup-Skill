# Step 12: Docs sync

The earlier steps deleted, moved, merged, and renamed code. Make the docs match again. Use `git diff <base>..HEAD --stat` (the conductor passes the base) to see what changed in this run.

- Re-check every doc against the code as it is now: README files, docs folders, CONTRIBUTING, setup guides, architecture notes, and agent instruction files (CLAUDE.md, AGENTS.md, and similar). Check paths, file names, function and component names, commands, env vars, setup steps, architecture descriptions, and code examples.
- Update anything this run made outdated.
- If the project has an agent instruction file, add a short line for each convention this run settled: the canonical patterns from step 8, the shared tokens or styles from step 7, the test command from step 3. Don't create a new instruction file.
- Fix broken links.

Done when: every documented path, name, and command exists and works.

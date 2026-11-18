# Step 1: Repo setup and docs

Goal: the repository's setup files and documentation match the code as it is now, before any other step runs.

## Repo setup
- **.gitignore**: add missing entries for this stack (dependencies, build output, caches, coverage, logs, OS and editor files, local env files). Remove an entry only if the project doesn't use that tool and no file on disk matches it.
- **Tracked files that should be ignored**: return them as files to untrack (the conductor runs `git rm --cached`; the local file stays) and make sure .gitignore covers them. Leave tracked anything that CI, deploy config, the package manifest, or the docs point at, such as a GitHub Action's committed `dist/` or a docs-site folder. If you're not sure, return a decision.
- **Committed env files**: untrack one only if it holds secrets, and return `Rotate: <name> found in <file>` for each secret, never the value. Frameworks such as Next.js and Vite commit `.env` files with non-secret defaults on purpose; leave those. Secrets hardcoded in source are step 5's job; don't scan for them here.
- **.gitattributes**: add rules only if there's a real problem, such as mixed line endings or binary files diffed as text.
- **Env examples**: .env.example (or the project's equivalent) lists every env var the code reads, with placeholder values, and nothing the code no longer reads.
- **Lockfiles**: one package manager per package. If there are lockfiles for several managers, keep the one the project uses (packageManager field, CI, docs) and delete the others. If the lockfile is out of sync with the manifest, update it with the package manager's install command.
- **Scripts, CI, and config** (package scripts, Makefile, CI workflows, Dockerfiles, tsconfig paths, lint and format configs): fix references to files, folders, commands, and scripts that no longer exist. Remove config for tools the project no longer uses, after confirming nothing runs them. Don't change what CI deploys or where.

## Docs
Covers README files, docs folders, CONTRIBUTING, setup guides, architecture notes, and agent instruction files (CLAUDE.md, AGENTS.md, .cursorrules, copilot-instructions). CHANGELOG entries and decision records are history: only fix their broken links.

Check every concrete claim against the code: install and run commands, env vars, file and folder paths, scripts, endpoints, config options, features, architecture, versions.
- **Outdated** (the code changed, the doc didn't): update the doc to match the code. Run documented commands that are safe (install, build, test) to confirm they work.
- **Unrelated**: untouched framework template text, text copied from another project, and docs for features that were removed from this codebase. Delete the file, or just the section if only part is unrelated, and fix links that pointed to it. Keep roadmaps, proposals, design docs, and docs for companion services (such as backend API docs in a frontend repo). If you're not sure, return a decision.
- **Missing basics**: if the README doesn't say how to install, run, and test, add those few lines. Don't write other new docs.
- **Agent instruction files**: fix outdated commands, paths, and conventions. Keep the team's rules and preferences even when you can't verify them.
- **Doc and code disagree about a business rule** (what the app should do, not how to run it): change neither. Return it as a decision with both versions; the business-logic step uses these.

Done when: .gitignore fits the stack, nothing that should be ignored is tracked, every documented command works, and no doc describes code that doesn't exist.

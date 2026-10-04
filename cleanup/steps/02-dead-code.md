# Step 2: Dead code

Goal: remove code nothing uses, so later steps don't spend effort on it.

## Find
Unused files, functions, classes, components, variables, constants, types, imports, and exports; unreachable branches; commented-out code blocks; unused dependencies in the manifest; unused CSS classes and styles; env vars and config keys nothing reads; feature flags hardcoded to one value in the code.

Use the stack's analysis tools to find candidates when they exist (for example knip or ts-prune for TypeScript, vulture for Python, unused-import lint rules). Run them through npx, uvx, or similar without adding them as dependencies, and still verify every candidate yourself.

## Before removing anything
Check for dynamic references: lazy or dynamic imports, string-based lookups, reflection, dependency injection, file-based routing and route config, framework conventions (pages and app folders, lifecycle hooks, decorators, signal handlers, management commands, migrations), config files that name it, templates, tests, build and CI scripts, and the public API of a published package.

## Fix
- Delete what's confirmed unused, together with its tests, styles, types, and docs.
- Remove unused dependencies with the package manager so the lockfile updates.
- If something outside this repo might use it (public exports, API endpoints, CLI commands, scheduled jobs, webhooks), return it as a decision instead.

Done when: checks pass and nothing removed was reachable.

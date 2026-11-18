# Step 8: Inconsistent patterns

Goal: each job is done one way across the codebase.

## Find
Jobs done in more than one way: data fetching, state management, forms and validation, styling approach, API clients, configuration loading, logging, date, number, and currency formatting, async style (callbacks, promises, async/await), routing, and test setup.

## Fix
For each job, choose one canonical approach: the one most of the code uses, or the one the project is clearly moving toward (the newest code, the docs, the agent instruction files). Not your preference. Migrate every place that deviates.

- Don't migrate code that differs because it solves a different problem.
- If migrating one place would mean a large rewrite (more than about 10 files, or a public interface change), return it as a decision with the size of the change.
- Behavior must not change.

Done when: checks pass and each job has one approach, apart from the ones returned as decisions.

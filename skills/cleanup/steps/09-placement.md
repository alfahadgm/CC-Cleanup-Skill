# Step 9: Code placement

First infer the project's intended structure from its folder layout and dominant patterns. Judge placement against that, not against an ideal architecture.

## Find and fix
- **Wrong layer**: business rules in UI components or route handlers, data access outside the data layer, side effects in modules that should be pure.
- **Wrong scope**: single-use code in shared modules (move it next to its only user), and shared code buried inside one feature (move it to the shared place).
- **Catch-all files**: utils or helpers files that mix unrelated topics. Move each function next to its users or into a module named for what it does. If a shared utils folder organized by topic is the project's convention, keep it and only fix misplaced items.
- **Import direction**: imports that point the wrong way (shared code importing a feature, a lower layer importing a higher one) or form cycles because of where code lives.
- **Variables and constants scoped wider than needed**: module-level values used by one function, exports used in one file.

## How to move
- Move whole files with plain `mv` (git detects the rename) and update every import. Move first and edit second, so the rename stays easy to follow in history.
- If the old path is part of a public API, keep a re-export at the old path.
- Skip moves that are only a matter of taste. Behavior must not change.

Done when: checks pass, there are no import cycles caused by placement, and each piece of code sits where the project's structure says it belongs.

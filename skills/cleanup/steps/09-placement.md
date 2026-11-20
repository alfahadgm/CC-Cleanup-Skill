# Step 9: Code placement

Take the project's structure from the layers in the brief. Where they are stated (architecture docs, agent instruction files, boundary rules in the lint or build config), that is the structure. Where they are only inferred, confirm them against the newest code before you rely on them: in a messy codebase the most common layout may be the mess. Judge placement against the project's structure, not against an ideal architecture.

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

## Return as decisions
- A reorganization that moves more than about 10 files. Give its size.
- A move the project's structure doesn't settle: the layers are only inferred and the code follows two layouts, or the piece fits two places equally well. Offer both places as options; don't pick one yourself.

Nothing changes for users in either case, so say that. The advantage of a move is code that is easier to find and change. Its disadvantage is a large change to review, and conflicts with work in progress on other branches.

Done when: checks pass, there are no import cycles caused by placement, and each piece of code sits where the project's structure says it belongs, apart from the moves returned as decisions.

# Step 7: Simplify

Goal: less code and fewer layers, with the same behavior. Work highest impact-to-effort first.

## Find and fix
- **Premature abstractions**: interfaces, base classes, factories, and generics with one implementation or one caller; config options nobody sets; layers that only pass calls through. Inline them.
- **Needless indirection**: wrappers that add nothing, re-export chains, single-use one-line helpers. Inline them.
- **Local complexity**: deeply nested conditionals (flatten them with early returns), functions that do several separable jobs one after another (split them where each piece has a clear name), boolean parameters that switch between two behaviors (make two functions). Only when the result is clearly easier to follow; length alone isn't a reason.
- **Hand-rolled logic** that the language's standard library or a library the project already depends on does well. Replace it. A library the project doesn't have yet is a decision, and only worth raising when it replaces substantial code, never for trivial logic.
- **Duplicated logic**: functions, validation, constants, and types repeated across files. Move each to one shared place that fits the project's structure.
- **Duplicated styling**: repeated CSS rule blocks and inline styles, and hardcoded colors, spacing, font sizes, radii, shadows, z-index values, and breakpoints. Detect the project's styling approach (plain CSS, Sass, Tailwind, CSS-in-JS) and centralize with it: CSS variables, Sass variables, the Tailwind theme, or the theme object. Create a token file only if none exists. Merge only identical values; near-identical ones (for example `#333` and `#343434`) change how the app looks, so return them as one decision per token.

Only merge code that represents the same concept. Leave code that looks similar but would change for different reasons.

Done when: checks pass, behavior is unchanged, and the code is smaller or simpler.

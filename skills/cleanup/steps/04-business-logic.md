# Step 4: Business logic

Goal: state machines and flows are correct, and no more complex than they need to be.

Input: this step needs the `Needs decision:` items from step 1's commit (doc-versus-code conflicts about business rules). Use them as evidence, and don't raise the same item again.

## Review
State machines, status fields, workflows, multi-step forms, checkout, booking, and approval flows, role-based permissions, and anything named status, state, step, stage, or phase. Map each flow's states and transitions, including ones implied by boolean flags and if-chains.

## Fix (clear defects only, each with a test)
- Unreachable states, states with no way out (users get stuck), transitions that skip a required step, transitions allowed from the wrong state, missing handling for a state the code itself defines.
- Duplicate or conflicting flags that can disagree with each other (for example `isPaid` and `status`), when they're in memory only.
- Needless complexity with no behavior change: several booleans that encode one status, transition logic copied into many places (move it into one function), checks repeated at every call site.

## Return as decisions
- Any change to what users see or have to do (fewer steps, a different order, removed options), even when it's simpler. Include the simpler alternative as an option.
- Rules where the code, docs, and tests disagree, or the intended rule is unclear.
- Changes to stored status values or the database schema.
For each one, give the location, the current behavior, and the options.

Done when: no flow has stuck or unreachable states, every fix has a test, and checks pass.

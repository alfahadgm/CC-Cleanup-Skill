# Step 4: Business logic

Goal: flows and state machines are no more complex than they need to be, and the user hears about everything that's wrong in them. This step doesn't change what a flow does: a flow that looks wrong may be the one the user agreed on, and data in production may depend on it.

Input: this step needs the `Needs decision:` items from step 1's commit (doc-versus-code conflicts about business rules). Use them as evidence, and don't raise the same item again.

## Review
State machines, status fields, workflows, multi-step forms, checkout, booking, and approval flows, role-based permissions, and anything named status, state, step, stage, or phase. Map each flow's states and transitions, including ones implied by boolean flags and if-chains.

## Fix (only where behavior stays exactly the same, each covered by a test)
- Several booleans that encode one status, when they're in memory only.
- Transition logic copied into many places (move it into one function).
- Checks repeated at every call site.

Before and after, the flow has the same states, the same transitions, the same errors, and the same stored values. If you can't show that, return a decision.

## Return as decisions
- Defects in a flow: unreachable states, states with no way out (users get stuck), transitions that skip a required step, transitions allowed from the wrong state, missing handling for a state the code itself defines.
- Flags that can disagree with each other (for example `isPaid` and `status`).
- Any change to what users see or have to do (fewer steps, a different order, removed options), even when it's simpler. Include the simpler alternative as an option.
- Rules where the code, docs, and tests disagree, or the intended rule is unclear.
- Changes to stored status values or the database schema.

In each one, the evidence describes the flow as it is today: its states, the transition in question, and what can reach it. Each option says what happens to records already stored in the affected state.

Done when: every flow is reviewed, each simplification is covered by a test, everything wrong in a flow is returned as a decision, and checks pass.

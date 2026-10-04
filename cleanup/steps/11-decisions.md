# Step 11: Apply the chosen decisions

The conductor passes each decision with the option the user chose. Apply exactly that option. Skip items marked "Leave as is".

- **Contract changes** (API fields, routes, DB columns, env vars, stored keys, event names): change every side in this repo together: server, client, types, tests, docs, .env.example. For a database change, add a new migration; never edit an existing one, and never run it against a real database. Where old data or old clients could still use the old name, keep accepting it and say so in the commit.
- **New dependencies**: add with the package manager, then replace the hand-rolled code.
- **Major upgrades**: follow the library's official migration guide.
- **Business rules and UX changes**: change the behavior and add a test for the new behavior.
- **Removing code used outside the repo**: remove it and note in the commit what external users must change.

Done when: every chosen option is applied, each behavior change has a test, and checks pass.

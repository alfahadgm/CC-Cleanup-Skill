# Step 6: Error handling

First detect the project's error conventions: exceptions or result types, error classes, how errors reach the user, and which logger it uses. Every fix matches them.

## Find and fix
- Swallowed errors: empty catch blocks, catch-and-ignore, `.catch(() => {})`, bare `except`. Handle the error, or let it reach a place that can.
- Missing awaits, unhandled promise rejections, and fire-and-forget calls whose failure matters.
- Errors caught too broadly or too early (one catch around a large block). Narrow them.
- Failures that leave state half-updated (partial writes, UI stuck loading). Use the transaction, rollback, or `finally` pattern the project already uses.
- External calls (network, database, file system, third-party APIs) with no timeout or failure path. Use the project's existing timeout values; if there are none, use a generous default (for example 30 seconds for HTTP) and say so in the commit.
- Users shown raw errors, stack traces, or nothing at all. Show a helpful message the way the project already does.
- Errors logged without enough context to debug (what failed, for which input or ID). Never log secrets or personal data.
- Several patterns for the same kind of failure. Move them to the project's main pattern.

Each behavior-changing fix gets a test that triggers the failure.

## Return as decisions
Changes to error responses that clients depend on (status codes, error body shape), and retry policies.

Done when: no swallowed errors remain, every external call has a failure path, and checks pass.

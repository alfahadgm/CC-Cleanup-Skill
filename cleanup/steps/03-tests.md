# Step 3: Tests (safety net)

Goal: the later steps change a lot of code, so critical behavior needs tests first. This step adds and repairs tests; it doesn't refactor source code.

1. **Setup.** Detect the test runner and how to run it. If there's none, add the standard one for this stack as a dev dependency (for example Vitest for Vite projects, Jest for other JavaScript or TypeScript projects, pytest for Python, the built-in runner for Go or Rust) with one script to run it and minimal config. If the setup is broken, fix it.
2. **Missing tests.** Find critical flows without tests: business rules, state transitions, calculations (money, dates, quantities), auth and permissions, data writes and deletes, input validation, and the main user journeys. Test their current behavior through public interfaces, so the tests survive later renames and moves. Use the kind of test the project already uses; for UI, component tests are enough unless the project already has end-to-end tests. Write a few meaningful tests rather than many shallow ones, and don't chase a coverage percentage.
3. **False confidence.** Fix tests that only check implementation details, mock the thing they test, have no real assertions, or are flaky. For flaky tests, find and fix the cause; don't add retries or longer timeouts to hide it.
4. **Bugs found by tests.** If a test exposes a bug and the intended behavior is unambiguous (a crash, an off-by-one, a wrong total), fix the bug and keep the test. If the intended behavior is unclear, don't write a test that locks in the bug; return it as a decision with the failing case.

Done when: the test command runs, every test passes except baseline failures, and each critical flow has at least one test that would fail if it broke.

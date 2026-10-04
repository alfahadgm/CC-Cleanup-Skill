# Step 5: Security

## Find
- Hardcoded secrets, keys, tokens, and passwords in code, config, tests, scripts, and committed env files.
- Missing authentication or permission checks on routes, API handlers, server actions, background jobs, and data queries, including users reading or changing other users' data.
- User input reaching dangerous places without validation or encoding: SQL and NoSQL queries, shell commands, file paths, HTML (XSS), URLs the server fetches (SSRF), redirects, deserialization, regular expressions (ReDoS), template rendering.
- Insecure defaults: permissive CORS, cookies without HttpOnly, Secure, or SameSite, debug mode or stack traces in production, missing CSRF protection where the framework expects it, weak password hashing, no rate limit on login and password reset.
- Sensitive data in logs, error messages, URLs, or client bundles (including server secrets exposed through public env prefixes such as NEXT_PUBLIC_ or VITE_).
- Dependencies with known vulnerabilities: run the package manager's audit command.

Verify each finding by tracing whether attacker-controlled input actually reaches it. Drop theoretical issues with no real path.

## Fix
- Prefer the framework's built-in protection: parameterized queries, output escaping, auth middleware, the validation library the project already uses.
- Add a test for each auth, permission, and injection fix that shows the attack failing.
- Secrets: move to env vars and add a placeholder to .env.example. If tests need the value, give them a dummy one in the test setup. Return `Set env: <name>` and `Rotate: <name> found in <file>`. Never print the value.
- Vulnerable dependencies: apply the patch and minor updates the audit recommends, if checks still pass.

## Return as decisions
Access changes that might be intentional (an endpoint that may be public on purpose), major dependency upgrades, and CORS or rate-limit values that depend on how the app is deployed.

Done when: no secrets are in tracked files, every sensitive route checks auth, no traced input reaches a dangerous place unsafely, and checks pass.

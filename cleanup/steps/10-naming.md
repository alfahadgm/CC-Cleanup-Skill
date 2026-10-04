# Step 10: Naming

Goal: every name makes its purpose, type, and behavior obvious from the name alone, to a person and to an LLM reading the code with little surrounding context. Prefer clear, unambiguous, greppable names over short ones.

## Fix these
1. **Inconsistent names**: one concept named several ways (userId / user_id / uid; fetch / get / load for one action; customer / client for one entity). Pick one canonical term per concept and use it everywhere.
2. **Misleading names**: a "get" that writes, "count" holding a list, an "isX" that isn't boolean, "validate" that also transforms, sync-sounding names on async code.
3. **Vague names**: temp, data, result, handle, obj, val, info, manager, helper, util, process, doStuff, x/y/z outside tiny scopes.
4. **Abbreviations**: acct, usr, mgr, calc, btn, idx, cfg, unexplained acronyms. Use full words unless the abbreviation is universal in this domain.
5. **Wrong type or plurality**: a singular name for a collection, a plural for a scalar, a name implying the wrong shape (map, list, set, tree).
6. **Booleans**: add is/has/should/can/did prefixes. Replace negative and double-negative booleans (isNotReady, disableHidden) with positive ones and invert the logic correctly.
7. **Missing units**: timeoutMs, sizeBytes, priceCents, distanceMeters, delaySeconds.
8. **Casing** that breaks the language's or the file's norms.
9. **Shadowing** builtins or common globals: list, dict, id, type, str, input, file, hash, object, Error.
10. **Redundant context**: user.userName, Account.accountStatus, UserUserService.
11. **Meaningless distinctions**: data / dataInfo, getAccount / getAccountData, ProductInfo / ProductData. If they're the same thing, use one name; if not, name the difference.
12. **Easily confused names**: release / releases, person / persons, optionA1 / optionAl.
13. **Asymmetric pairs**: open/dispose, start/halt, add/destroy. Use open/close, start/stop, add/remove, create/delete, push/pop.
14. **Stale names**: new*, *V2, *Old, *Legacy, *Temp, *2, *Final, and names describing behavior the code no longer has.
15. **Hungarian notation**: strName, arrItems, bFlag, iCount.
16. **Domain mismatch**: generic terms where the project has its own domain vocabulary, or the reverse. Use the team's terms consistently.

## Every new name must be
- self-describing without reading the body or the callers
- unambiguous in this codebase (if "order" could mean sequence or purchase, say which)
- consistent: one verb per action, one noun per entity
- greppable: no substring collisions with other names
- full words, describing intent rather than implementation

## How to rename
- Use the language server or IDE rename where available. Otherwise update every reference, including tests, mocks, fixtures, string-based lookups, docs, and comments.
- Rename a file when the main thing in it is renamed (plain `mv`), and update imports.
- Rename internal names only. Names that are part of an external contract (API fields, DB columns, env vars, stored keys, event names, public exports, CSS classes used outside the repo) are decisions: give the suggested name and what a migration would involve.
- Apply each concept-wide rename (item 1) as one batch, so the codebase is never half renamed.

Done when: checks pass and each concept has one name everywhere.

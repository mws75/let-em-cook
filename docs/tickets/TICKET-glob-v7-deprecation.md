# Ticket: glob@7.2.3 deprecation warning

> Scope: this ticket covers the **glob@7.2.3** deprecation warning specifically.
> There is a **separate** `glob@10.5.0` deprecation warning being handled by another
> agent/ticket — do not conflate the two. The glob@10.5.0 instance comes in through
> `@jest/reporters` / `jest-config` / `jest-runtime`; the glob@7.2.3 instance covered
> here comes in through `babel-plugin-istanbul → test-exclude`. This ticket also notes
> the related `inflight@1.0.6` warning, which is dragged in **by** glob@7 and will be
> resolved by the same fix.

## Summary

`npm install` prints:

```
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain
widely publicized security vulnerabilities, which have been fixed in the current
version. Please update.
```

This is a **transitive, dev-only** dependency pulled in by **Jest** (our test runner)
through the code-coverage instrumentation chain. It does **not** ship in the Next.js
runtime/production bundle, is never reachable by end users, and the one actually-known
CVE behind the warning is already patched in the version of `minimatch` resolved in our
tree. The correct fix lives **upstream** (in `babel-plugin-istanbul` / `test-exclude`),
not in our code. Recommended action: **no urgent change**; track the upstream bump and
optionally suppress the noise. Priority: **Low**.

## The Warning

- Deprecated package: **`glob@7.2.3`**
- Related warning bundled with it: **`inflight@1.0.6`** — `npm warn deprecated
  inflight@1.0.6: This module is not supported, and leaks memory. Do not use it.`
  `inflight` is a direct dependency of `glob@7` (`glob@7` → `inflight@^1.0.4`), so it
  disappears automatically once glob@7 is gone.
- Where in the tree: `node_modules/test-exclude/node_modules/glob` (a nested,
  non-hoisted copy, distinct from the hoisted `glob@10.5.0` at `node_modules/glob`).

## Dependency Chain

`npm ls glob` (from repo root):

```
let-em-cook@0.1.0 C:\Users\spencm\code\let-em-cook
`-- jest@30.3.0
  `-- @jest/core@30.3.0
    +-- @jest/reporters@30.3.0
    | `-- glob@10.5.0            <-- SEPARATE warning (other agent/ticket)
    +-- @jest/transform@30.3.0
    | `-- babel-plugin-istanbul@7.0.1
    |   `-- test-exclude@6.0.0
    |     `-- glob@7.2.3         <-- THIS TICKET
    +-- jest-config@30.3.0
    | `-- glob@10.5.0 deduped
    `-- jest-runtime@30.3.0
      `-- glob@10.5.0 deduped
```

**The single chain that brings in glob@7.2.3:**

```
jest@30.3.0 (devDependency)
  └─ @jest/core@30.3.0
      └─ @jest/transform@30.3.0
          └─ babel-plugin-istanbul@7.0.1   (coverage instrumentation)
              └─ test-exclude@6.0.0
                  └─ glob@7.2.3   (deprecated)
                      ├─ inflight@1.0.6   (deprecated — memory leak)
                      └─ minimatch@3.1.5  (resolved; ReDoS-patched, see Analysis)
```

Relevant `package-lock.json` facts:
- `node_modules/test-exclude/node_modules/glob` → version **7.2.3**, `"dev": true`.
- `test-exclude@6.0.0` declares `"glob": "^7.1.4"` and `"minimatch": "^3.0.4"`.
- `glob@7.2.3` declares `"inflight": "^1.0.4"` and `"minimatch": "^3.1.1"`; in this
  tree those resolve to `inflight@1.0.6` (dev) and `minimatch@3.1.5` (dev).

**Only one top-level dependency transitively brings in glob@7: `jest`** (a
`devDependency`). No production dependency references glob@7.

## Analysis

**Direct vs transitive:** Transitive. We do not depend on `glob` directly (it is not
in `package.json`).

**Dev vs prod:** **Dev only.** The entire chain (`jest` → `babel-plugin-istanbul` →
`test-exclude` → `glob@7`) sits under `devDependencies`, and every node is flagged
`"dev": true` in `package-lock.json`. `babel-plugin-istanbul`/`test-exclude` are code-
coverage tooling used only when running `npm test` / `npm run test:coverage`.

**Ships in runtime bundle?** **No.** `next build` bundles only what the app imports;
Jest and its coverage instrumentation are never imported by application code, so
glob@7 cannot reach the production bundle or any deployed surface. There is no
user-facing attack surface.

**What is the actual vulnerability?** The deprecation text refers to the fact that
old glob pulls in an old `minimatch`, whose `braceExpand()` had a Regular-Expression
Denial-of-Service (ReDoS) flaw:

- **CVE-2022-3517** (GHSA-f8q6-p94x-37v3) — ReDoS in `minimatch` `braceExpand`.
  A maliciously crafted glob pattern can trigger catastrophic regex backtracking and
  hang the process (CPU exhaustion). **Fixed in `minimatch@3.0.5`.**

Crucially, in **our** tree `glob@7.2.3` resolves `minimatch` to **3.1.5**, which is
**already past the 3.0.5 fix** — so the specific CVE the deprecation warns about is
**not present** here. The remaining flagged item, `inflight@1.0.6`, is an
**unmaintained module with a memory leak** (no CVE assigned); it is only exercised for
in-flight request de-duplication inside glob's async file walking, which coverage
tooling runs briefly and locally.

**Exploitability in this build-tool/transitive context:** Effectively nil.
- Even if `minimatch` were unpatched, ReDoS requires attacker-controlled glob patterns.
  The only glob patterns fed to `test-exclude` are our own coverage `include`/`exclude`
  globs from Jest config — not attacker input. This runs on a developer machine / CI,
  not in production.
- `inflight`'s memory leak is irrelevant for short-lived test processes.

**Who must fix it — us or upstream?** **Upstream.** The pin to `glob@7` /
`inflight@1.0.6` lives inside `test-exclude@6.0.0`, which is required by
`babel-plugin-istanbul@7.0.1`, which is required by `@jest/transform`. The real fix is
for that chain to move to `test-exclude@^7` (which depends on `glob@^10` and drops
`inflight`). This is a known, tracked issue in Jest (jestjs/jest #15173, #15236,
#15926) and mirrors the same warnings seen in aws-cdk, Hardhat, etc. We can only work
around it locally via an `overrides` block; we cannot "fix" the source packages.

**Why a blind `glob@^10/^11` override is risky:** glob's API **changed incompatibly
between v7 and v9**. v7 exposes a callback/`glob.sync` API and CommonJS default export;
v9+ dropped the callback API, changed export shape, and became Promise-first.
`test-exclude@6.0.0` calls glob using the **v7** API. Forcing
`"glob": "^10"` (or `^11`) via `overrides` would substitute an incompatible glob under
`test-exclude@6`, which can throw at runtime (`glob is not a function` / sync API
missing) and **break `npm test` coverage**. The safe workaround is to override the
**parent** (`test-exclude`) to a version that natively bundles glob@10, rather than
overriding `glob` itself.

## Risk Assessment

| Dimension | Assessment |
|---|---|
| Reachable in production runtime | **No** — dev/test tooling only, not bundled |
| Known CVE (CVE-2022-3517 ReDoS) present in our tree | **No** — resolved `minimatch@3.1.5` is already patched (fix landed in 3.0.5) |
| Attacker-controllable input to the vulnerable code path | **No** — only our own Jest coverage globs |
| `inflight` memory leak impact | **Negligible** — short-lived test processes |
| Overall security risk to this project | **Very low / informational** |
| Cost of leaving as-is | Cosmetic install-time warning noise only |

## Recommendation

**Primary recommendation: accept the warning for now (no code change required).** The
warning is cosmetic for this project — dev-only, not bundled, and the referenced CVE is
already patched in the resolved `minimatch`. Track the upstream fix instead:

1. Periodically run `npm outdated jest babel-plugin-istanbul` and bump `jest` when a
   release ships `babel-plugin-istanbul` → `test-exclude@^7` (which uses `glob@^10` and
   drops `inflight`). This clears the warning at the source with zero risk. This is the
   preferred long-term fix.

**Optional: silence the warning now via a targeted `overrides` on the _parent_**
(NOT on `glob` directly). If the install-time noise is bothersome and you want it gone
before Jest upstream catches up, override `test-exclude` to a glob@10-based line:

```jsonc
// package.json  (add at top level)
"overrides": {
  "babel-plugin-istanbul": {
    "test-exclude": "^7.0.1"
  }
}
```

`test-exclude@7.x` depends on `glob@^10` internally and no longer pulls `inflight`, so
this removes **both** the `glob@7.2.3` and `inflight@1.0.6` warnings together, while
keeping glob usage encapsulated inside a `test-exclude` version that is written against
the new glob API (avoiding the API-break trap described below).

After adding it:

```bash
rm -rf node_modules package-lock.json   # or: npm install with a clean lock
npm install
npm ls glob            # confirm glob@7.2.3 is gone from the test-exclude branch
npm test               # MUST pass — verify coverage instrumentation still works
npm run test:coverage  # verify coverage report still generates
```

> **DO NOT do this instead:**
> ```jsonc
> "overrides": { "glob": "^10" }   // <-- risky, do not use
> ```
> A blanket `glob@^10`/`^11` override forces the **v9+ API** underneath
> `test-exclude@6.0.0`, which is written against the **v7** glob API (callback /
> `glob.sync` / CJS default export). glob v9 removed those, so this can break `npm test`
> with errors like `glob is not a function`. If you must override `glob` directly, pin
> to the **latest v7** line (`"glob": "^7.2.3"` — API-compatible, still technically
> deprecated so the warning persists), which is pointless here. Overriding the parent
> `test-exclude` is the correct, API-safe approach.

**Whichever path is chosen, `npm test` and `npm run test:coverage` must pass** before
merging — that is the only real regression surface for this change.

## Effort / Priority

- **Priority: Low** (informational). No production exposure; referenced CVE already
  patched in-tree; input is not attacker-controlled.
- **Effort:**
  - Do-nothing / track upstream: **~0** (just re-bump `jest` on a future release).
  - Optional `overrides` workaround + verify tests: **~15–30 min** (add block, clean
    reinstall, run `npm test` + `npm run test:coverage`).
- **Suggested disposition:** Leave as-is and revisit when bumping Jest; apply the
  parent-`test-exclude` override only if the install-time warnings need to be silenced
  for CI hygiene.

---

### References

- CVE-2022-3517 (minimatch ReDoS, fixed in 3.0.5) — https://app.opencve.io/cve/CVE-2022-3517
- Jest tracking issues: jestjs/jest#15173, #15236, #15926
- glob v7→v9 API change / v7 no longer supported — glob maintainer notes

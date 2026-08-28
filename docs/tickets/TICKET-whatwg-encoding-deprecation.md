# Ticket: whatwg-encoding deprecation warning

## Summary

`npm install` prints a deprecation warning for **`whatwg-encoding@3.1.1`**. This
package is pulled in **transitively and dev-only** through the Jest test toolchain
(`jest-environment-jsdom` → `jsdom@26.1.0`). It is a **test-time** dependency — it
is **not** part of the Next.js runtime bundle shipped to users, and no code we own
imports it. The warning is a "use a better library" nudge from the maintainer
(who archived the package in late 2025 and points to `@exodus/bytes`), **not** a
security advisory — `npm audit` reports no vulnerability for it. There is no urgent
action. The correct long-term fix lives upstream in Jest: `jest-environment-jsdom`
still pins `jsdom@^26.1.0`, and jsdom only dropped `whatwg-encoding` in
**jsdom@27.4.0**. Until Jest bumps its jsdom range we can either wait or force a
newer jsdom locally with an npm `overrides` entry.

## The Warning

```
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more
spec-conformant and faster implementation
```

## Dependency Chain

`npm ls whatwg-encoding` shows a **single** top-level origin, entirely under the
dev-only `jest-environment-jsdom` dependency, arriving via two edges:

```
let-em-cook@0.1.0
`-- jest-environment-jsdom@30.3.0            (devDependency)
  `-- jsdom@26.1.0
    +-- html-encoding-sniffer@4.0.0
    | `-- whatwg-encoding@3.1.1  deduped     DEPRECATED
    `-- whatwg-encoding@3.1.1                DEPRECATED
```

Key facts from `package-lock.json`:

- `whatwg-encoding@3.1.1` lock entry has `"dev": true` and the `deprecated` field
  set to the exact warning text above (line ~11542 of `package-lock.json`).
- It is required by **`jsdom@26.1.0`** directly (`"whatwg-encoding": "^3.1.1"`) and
  indirectly through **`html-encoding-sniffer@4.0.0`** (which also requires
  `whatwg-encoding@^3.1.1`); npm dedupes them to one installed copy.
- The only top-level dependency in the chain is `jest-environment-jsdom` (declared
  in `devDependencies` of `package.json`, `^30.3.0`).

**Classification: transitive, `devDependencies`-only, test-time. Not present in the
shipped Next.js runtime bundle (`next build` does not bundle Jest/jsdom).**

## Analysis

### Security issue or just a nudge?

Just a nudge. The maintainer (jsdom org) archived `whatwg-encoding` in late 2025
and rewrote the encoding logic into `@exodus/bytes`, advertised as "more
spec-conformant and faster." There is **no CVE** attached to `whatwg-encoding@3.1.1`
— `npm audit` returns no vulnerability match for it. The warning is a
maintenance/EOL signal, not a security patch.

### Is `@exodus/bytes` a drop-in WE can adopt?

**No — not directly.** `@exodus/bytes` is a **different package with a different
API**, not a version bump of `whatwg-encoding`. You cannot alias one to the other
with a simple npm override, because jsdom's source `import`s `whatwg-encoding`
specifically. Swapping to `@exodus/bytes` is a **code change inside jsdom**, not
something a downstream consumer can do via `package.json`. So this is fundamentally
an **upstream fix**, owned by jsdom (already done) and by Jest (pending).

### Is there a fixed upstream version? (verified against the npm registry)

- **jsdom dropped `whatwg-encoding` in `jsdom@27.4.0`.** Confirmed: `jsdom@27.3.0`
  still declares `whatwg-encoding: ^3.1.1`; `jsdom@27.4.0`, `jsdom@28.0.0`, and the
  current `jsdom@30.0.1` declare **no** `whatwg-encoding` dependency (they use
  `@exodus/bytes` instead).
- **But `jest-environment-jsdom` still pins old jsdom.** Even the latest
  `jest-environment-jsdom@30.5.0` declares `jsdom: ^26.1.0` — so a plain
  `npm update jest-environment-jsdom` stays on jsdom 26.x and does **not** clear the
  warning.
- Tracking upstream: Jest issue **jestjs/jest#16000** requests bumping to
  jsdom ≥ 27.4; PR **#16176** is open but, as of this writing, not released. When a
  future `jest-environment-jsdom` widens its jsdom range to 27.4+/28+, the warning
  clears with a normal dependency update.

## Risk Assessment

- **Severity: none / cosmetic (informational).** Dev/test-time only, no runtime
  exposure, no CVE.
- **No production/runtime exposure.** `jest-environment-jsdom` and its whole subtree
  are `devDependencies`; nothing here is bundled by `next build` or served to users.
  Encoding behavior of the *shipped app* is unaffected — this code only runs inside
  the jsdom test environment.
- **No security CVE** attaches to `whatwg-encoding@3.1.1` (confirmed clean via
  `npm audit`). The only downside of staying on it is that it is now unmaintained
  (bug/security fixes will not land), which matters only if a future issue is found
  in a package that solely runs in the test harness.
- **Risk of acting** (forcing a newer jsdom, see Option B) is the only real risk:
  overriding jsdom from 26 → 27.4+/latest is a **major-version bump underneath a
  wrapper (`jest-environment-jsdom`) that was written against jsdom 26**. It may work
  (the wrapper is thin) but is unvalidated by Jest; must be verified with a full
  `npm test` run.

## Recommendation

**Recommended action: No action needed now — wait for upstream (Jest).**

This is a dev-only, test-time deprecation warning with no runtime or security impact
for this project. Let it clear naturally when `jest-environment-jsdom` widens its
jsdom range to 27.4+/28+ (tracking: jestjs/jest#16000 / PR #16176). Periodically run
`npm outdated jest-environment-jsdom` and, after any bump, re-check
`npm ls whatwg-encoding`.

**Optional — silence it now via an npm `overrides` (only if a clean `npm install`
log is required for compliance).**

Because `@exodus/bytes` is not a drop-in for `whatwg-encoding`, the *only* way to
remove `whatwg-encoding` today is to force jsdom onto a version that already dropped
it. Add an `overrides` block to `package.json`:

```jsonc
// package.json
"overrides": {
  "jest-environment-jsdom": {
    "jsdom": "^27.4.0"
  }
}
```

(Or force it globally with `"overrides": { "jsdom": "^27.4.0" }`, or pin the current
`"jsdom": "^30.0.1"`.) Then:

```bash
# Windows / PowerShell:  Remove-Item -Recurse -Force node_modules, package-lock.json
rm -rf node_modules package-lock.json
npm install
npm ls whatwg-encoding   # should report "(empty)" / not found
npm test                 # MUST pass — this changes the jsdom test environment
```

Notes for the override path:
- This is a **major** jsdom bump (26 → 27+) beneath a wrapper Jest has not yet
  certified against it. Treat `npm test` passing as the gate; revert the override if
  the jsdom environment misbehaves.
- Do **not** try to override `whatwg-encoding` itself to `@exodus/bytes` — different
  package, different API; jsdom imports `whatwg-encoding` by name and it would break.
- Prefer removing the override later once Jest ships the jsdom bump, so the tree
  tracks Jest's supported combination.

## Effort / Priority

- **Priority: Low** (cosmetic dev-tooling warning; no runtime/security impact).
- **Effort:** No-action = zero. Override path ≈ 15–30 min (add override, reinstall,
  run `npm test`, confirm `npm ls whatwg-encoding` is empty) — plus regression risk
  from the major jsdom bump.
- **Recommendation:** Defer and wait for the upstream Jest release unless a clean
  install log is mandated, in which case apply the override and gate on `npm test`.

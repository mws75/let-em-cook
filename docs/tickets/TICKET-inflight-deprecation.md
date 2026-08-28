# Ticket: inflight deprecation warning

## Summary

`npm install` prints a deprecation warning for **`inflight@1.0.6`**. This package
is pulled in **transitively and dev-only** through the Jest test toolchain (via an
old `glob@7`). It is a **build/tooling-time** dependency — it is **not** part of the
Next.js runtime bundle shipped to users. No code we own imports it. The warning is
noise; the memory-leak concern does not apply to this project's usage. There is no
urgent action; the correct long-term fix is an upstream `glob` upgrade, which we can
either wait for or force locally with an npm `overrides` entry.

## The Warning

```
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory.
Do not use it. Check out lru-cache if you want a good and tested way to coalesce
async requests by a key value, which is much more comprehensive and powerful.
```

## Dependency Chain

`npm ls inflight` shows a **single** chain, entirely under the dev-only `jest` dependency:

```
let-em-cook@0.1.0
`-- jest@30.3.0                              (devDependency)
  `-- @jest/core@30.3.0
    `-- @jest/transform@30.3.0
      `-- babel-plugin-istanbul@7.0.1        (depends on test-exclude ^6.0.0)
        `-- test-exclude@6.0.0               (depends on glob ^7.1.4)  <-- the culprit
          `-- glob@7.2.3                     (depends on inflight ^1.0.4)
            `-- inflight@1.0.6               DEPRECATED
```

Key facts from `package-lock.json`:

- `inflight@1.0.6` — lock entry has `"dev": true` and the `deprecated` field set.
- The pinned `glob@7.2.3` lives at `node_modules/test-exclude/node_modules/glob`
  (nested), pulled by **`test-exclude@6.0.0`** which requires `glob@^7.1.4`.
- The project also has a **separate** top-level `glob@10.5.0` (dev, also flagged
  "old versions" deprecated but that is a different warning). `glob@10` does **not**
  depend on `inflight`. Only the `test-exclude@6 -> glob@7` edge drags in `inflight`.
  (The `glob@7`/old-glob warning is being handled in a separate ticket; this one is
  strictly the `inflight` sub-dependency of that same `glob@7`.)

**Classification: transitive, devDependencies-only, build/test-time. Not in the
shipped Next.js runtime bundle.**

## Analysis

### Who has to fix it — us or upstream?

Upstream. `inflight` only exists because `test-exclude@6` still requires the
callback-era `glob@7`. The fix is for the toolchain to move to a `test-exclude`
that uses modern `glob` (v9+/v10+, which dropped `inflight`).

Relevant upstream versions (verified against the npm registry):

- **`test-exclude@7.0.0`+** (June 2024) switched to **`glob@^10.4.1`** — no `inflight`.
  Latest `7.0.2` (Feb 2026) still `glob@^10.4.1`. Requires Node `>=18`.
- **`test-exclude@8.0.0`** (Feb 2026) bumps to `glob@^13`.
- **`babel-plugin-istanbul@8.0.0`** (Feb 2026) bumps its dep to
  **`test-exclude@^7.0.1`** and requires Node `>=18`. Our installed
  `babel-plugin-istanbul@7.0.1` still pins `test-exclude@^6.0.0`, which is why we
  are stuck on `glob@7`.
- Our `@jest/transform@30.3.0` requires `babel-plugin-istanbul@^7.0.1`, so a plain
  `npm update` will **not** move us to `babel-plugin-istanbul@8` on its own. The
  clean upstream resolution is a future Jest release that bumps to
  `babel-plugin-istanbul@8` (→ `test-exclude@7` → `glob@10`). Until Jest does that,
  the only way to drop `inflight` today is a local `overrides` entry.

### Can an npm `overrides` force it away today?

Yes. Because the whole chain is dev-only tooling, we can safely force the
`test-exclude` (or `glob`) resolution. The lowest-risk override is to bump
**`test-exclude` to v7**, which is the version actually written for the modern
`glob@10` API. (Do **not** naively override `glob` to `^10` *underneath*
`test-exclude@6` — v6's code uses the old glob callback API and would break.)

## Risk Assessment

- **Severity: very low / cosmetic.** The `inflight` memory leak only matters for
  **long-lived processes that perform many concurrent `glob` calls** keyed on the
  same lock. Here `glob@7` runs only inside `test-exclude`, invoked by
  short-lived, single-shot Jest test/coverage runs. The process exits in seconds;
  any leaked memory is reclaimed immediately.
- **No production/runtime exposure.** `jest` and its entire subtree are
  `devDependencies`; nothing here is bundled by `next build` or served to users.
- **No security CVE** attaches to `inflight` itself (the paired `glob@7` "old
  versions" warning references vulnerabilities — track that in its own ticket, but
  it too is dev-only here).
- **Risk of acting** (the override) is the only real risk: forcing `test-exclude@7`
  changes a package inside Jest's coverage/`test-exclude` path. Node `>=18` is
  required by `test-exclude@7`/`babel-plugin-istanbul@8`; confirm the CI/build Node
  version satisfies that before applying. Validate with a full `npm test` +
  `npm run test:coverage` after any change.

## Recommendation

Two acceptable paths:

**Option A — Do nothing now (recommended default).**
It is a dev-only, build-time deprecation warning with no runtime or security impact
for this project. Let it clear naturally when a future `jest` release adopts
`babel-plugin-istanbul@8` → `test-exclude@7` → `glob@10`. Periodically run
`npm outdated jest` / `npm update jest` and re-check `npm ls inflight`.

**Option B — Silence it now via an npm `overrides` (optional).**
If you want a clean `npm install`, add an `overrides` block to `package.json` to
force the modern `test-exclude` (which uses `glob@10`, dropping `inflight`):

```jsonc
// package.json
"overrides": {
  "test-exclude": "^7.0.2"
}
```

Then:

```bash
rm -rf node_modules package-lock.json   # (Windows: Remove-Item -Recurse -Force node_modules, package-lock.json)
npm install
npm ls inflight        # should now report "(empty)" / not found
npm test               # confirm the suite still passes
npm run test:coverage  # exercises babel-plugin-istanbul/test-exclude specifically
```

Notes for Option B:
- `test-exclude@7` requires **Node >=18** — verify local + CI Node before applying.
- This also removes the nested `glob@7.2.3`, so it doubles as a partial fix for the
  companion `glob@7` deprecation ticket.
- If you'd rather pin the exact leaf, an equivalent override is
  `"glob": "^10.4.1"` scoped under test-exclude, but the top-level `test-exclude`
  override above is simpler and keeps glob's API matched to the code that calls it.

## Effort / Priority

- **Priority: Low** (cosmetic dev-tooling warning; no runtime/security impact).
- **Effort:** Option A = zero. Option B ≈ 15–30 min (add override, reinstall, run
  `npm test` + coverage, confirm `npm ls inflight` is empty).
- **Recommendation:** defer (Option A) unless a clean install log is desired, in
  which case apply Option B alongside the separate `glob@7` deprecation ticket so
  both dev-only glob/inflight warnings are resolved in one change.

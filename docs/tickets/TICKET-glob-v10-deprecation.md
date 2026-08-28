# Ticket: glob@10.5.0 deprecation warning

> Scope: this ticket covers the **glob@10.5.0** deprecation warning specifically.
> There is a **separate** `glob@7.2.3` deprecation warning (plus a related
> `inflight@1.0.6` warning) being handled by another agent/ticket
> (`TICKET-glob-v7-deprecation.md`) — do not conflate the two. The **glob@10.5.0**
> instance covered here is the hoisted copy at `node_modules/glob`, pulled in through
> `@jest/reporters` / `jest-config` / `jest-runtime`. The glob@7.2.3 instance is a
> separate nested copy at `node_modules/test-exclude/node_modules/glob` via
> `babel-plugin-istanbul → test-exclude`.

## Summary

`npm install` prints:

```
npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain
widely publicized security vulnerabilities, which have been fixed in the current
version. Please update.
```

This is a **transitive, dev-only** dependency pulled in by **Jest** (our test runner).
It does **not** ship in the Next.js runtime/production bundle and is never reachable by
end users. **The nuance that matters here:** `glob@10.5.0` is a **blanket "old major"
deprecation**, not a flag on a genuinely vulnerable build. `10.5.0` is literally the
maintainer's `legacy-v10` release and — crucially — it is the **patched** release that
*fixed* the one real recent glob CVE (**CVE-2025-64756**, patched in `10.5.0` and
`11.1.0`). So the version we have is *not* the vulnerable one, and even the vulnerable
code path is **CLI-only** and unreachable from Jest's programmatic use. Recommended
action: **no urgent change**; optionally silence the warning with a low-risk `overrides`
bump (v10 → v11/v13 is API-compatible, unlike the v7→v9 break). Priority: **Low**.

## The Warning

- Deprecated package: **`glob@10.5.0`**
- Where in the tree: `node_modules/glob` (the hoisted/top-level copy) — distinct from
  the nested `node_modules/test-exclude/node_modules/glob` @ 7.2.3 handled elsewhere.
- Nature of the warning: the glob maintainer (isaacs) applies the same generic
  "Old versions of glob are not supported… security vulnerabilities… Please update"
  message to **every** superseded major/minor when a new line ships. As of writing, the
  same blanket deprecation is applied even to `11.1.0`. It is **not** a version-specific
  security advisory.

## Dependency Chain

`npm ls glob` (from repo root):

```
let-em-cook@0.1.0 C:\Users\spencm\code\let-em-cook
`-- jest@30.3.0
  `-- @jest/core@30.3.0
    +-- @jest/reporters@30.3.0
    | `-- glob@10.5.0            <-- THIS TICKET
    +-- @jest/transform@30.3.0
    | `-- babel-plugin-istanbul@7.0.1
    |   `-- test-exclude@6.0.0
    |     `-- glob@7.2.3         <-- SEPARATE warning (other agent/ticket)
    +-- jest-config@30.3.0
    | `-- glob@10.5.0 deduped
    `-- jest-runtime@30.3.0
      `-- glob@10.5.0 deduped
```

**The chains that bring in glob@10.5.0** — all under the single top-level
`jest` devDependency, deduped to one hoisted copy at `node_modules/glob`:

```
jest@30.3.0 (devDependency)
  └─ @jest/core@30.3.0
      ├─ @jest/reporters@30.3.0  → glob@10.5.0   (primary; hoisted install site)
      ├─ jest-config@30.3.0      → glob@10.5.0   (deduped to the same copy)
      └─ jest-runtime@30.3.0     → glob@10.5.0   (deduped to the same copy)
```

Relevant `package-lock.json` facts:
- Root `devDependencies.jest` = **`^30.2.0`** (resolved to `jest@30.3.0`).
- `node_modules/glob` → version **`10.5.0`**, `"dev": true`.
- `@jest/reporters@30.3.0`, `jest-config@30.3.0`, and `jest-runtime@30.3.0` each declare
  `"glob": "^10.5.0"`; npm satisfies all three with the single hoisted `10.5.0` copy.

**Only one top-level dependency transitively brings in glob@10: `jest`** (a
`devDependency`). No production dependency references glob at all.

## Analysis

**Direct vs transitive:** Transitive. `glob` is not in our `package.json`.

**Dev vs prod:** **Dev only.** The whole chain sits under `devDependencies` and every
node is `"dev": true` in `package-lock.json`. Jest is used only for `npm test`.

**Ships in runtime bundle?** **No.** `next build` bundles only what the app imports.
Jest, `@jest/reporters`, `jest-config`, and `jest-runtime` are never imported by
application code, so this glob copy cannot reach the production bundle or any deployed
surface. No user-facing attack surface.

**Is there a genuine CVE — and does our version have it?**
There is exactly one notable recent glob advisory, and **our version is already the
fix**, not the vulnerable one:

- **CVE-2025-64756** / **GHSA-5j98-mcp5-4vw2** (High, CVSS 3.1 = 7.5) — **command
  injection in the glob _CLI_** `-c` / `--cmd` option. Matched filenames were passed to
  a shell with `shell: true`, so shell metacharacters in a filename could execute
  arbitrary commands. **Affects glob 10.2.0 – 11.0.3. Patched in `10.5.0` and `11.1.0`.**

So `glob@10.5.0` in our tree is the **remediated** release for that CVE — it does *not*
carry it. On top of that, the vulnerability is reachable **only via the `glob` command
-line binary** (`glob -c '<cmd>' <patterns>`). Jest consumes glob **programmatically**
(the library API), never the CLI, and never with attacker-controlled filenames. So even
the pre-10.5.0 form of this CVE would not have been exploitable through our chain.

Conclusion: **the deprecation warning is cosmetic here.** It is the maintainer's generic
"old major" sweep, not evidence of an unpatched vulnerability in our resolved tree.

**Who must fix it — us or upstream?** **Upstream.** The `glob@^10.5.0` requirement lives
inside Jest's own packages (`@jest/reporters`, `jest-config`, `jest-runtime`). The clean
fix is a future Jest release that bumps its internal `glob` to v11/v13. We cannot edit
those packages; we can only bump Jest or apply a local `overrides`.

**The v10 → v11/v13 API-compatibility situation (why an override is _safe_ here):**
Unlike the notorious **v7 → v9** break (which removed the callback/`glob.sync`-style API
and changed the export shape — see the glob@7 ticket), **glob v10, v11, v12, and v13 are
all the same modern rewrite and are largely API-compatible.** The major bumps after v10
are essentially environment/packaging changes, not programmatic-API breaks:

- **v11.0** — drops support for Node.js < 20 (engine bump only; no API change). This
  project is Next.js 16 / React 19, which already requires Node ≥ 20, so this is a non
  -issue for us.
- **v12.0** — removes the unsafe `--shell` CLI option (CLI-only; no library API change).
- **v13.0** — extracts the **CLI** into a separate `glob-bin` package; the importable
  library API is unchanged. Jest uses the library, not the CLI, so this does not affect
  Jest.

Because the programmatic surface Jest relies on is stable across v10→v13, forcing a newer
glob via `overrides` is **low-risk** here — the exact opposite of the v7 case, where
overriding to v10 would break the consumer. Latest published glob is **`13.0.6`**
(`dist-tags.latest`); `11.1.0` is the newest v11.

## Risk Assessment

| Dimension | Assessment |
|---|---|
| Reachable in production runtime | **No** — dev/test tooling only, not bundled |
| Known CVE present in our tree (CVE-2025-64756) | **No** — `10.5.0` is the *patched* release; the CVE affects ≤ 10.4.x / ≤ 11.0.3 |
| Is the vulnerable code path even reachable | **No** — CVE-2025-64756 is **CLI-only** (`glob -c`); Jest uses the library API |
| Attacker-controllable input to any glob path | **No** — only Jest's own internal globs on a dev/CI machine |
| Is the warning version-specific or blanket | **Blanket** — generic "old major" deprecation, also applied to 11.1.0 |
| Overall security risk to this project | **Very low / informational** |
| Cost of leaving as-is | Cosmetic install-time warning noise only |

## Recommendation

**Primary recommendation: accept the warning (no code change required).** For this
project the warning is purely cosmetic — dev-only, not bundled, our `10.5.0` is already
the patched release for the only relevant CVE, and that CVE is CLI-only and unreachable
from Jest. Track the upstream fix instead:

1. Periodically run `npm outdated jest` and bump `jest` when a release ships that
   requires `glob@^11`/`^13` internally. That clears the warning at the source with zero
   risk. Preferred long-term fix.

**Optional: silence the warning now via a targeted `overrides`.** Because v10→v11/v13 is
API-compatible (see Analysis), overriding `glob` directly is safe here — no consumer in
the Jest chain depends on removed v10 behavior. Add to `package.json` (top level):

```jsonc
// package.json
"overrides": {
  "glob": "^11.1.0"
}
```

Notes on the override target:
- **`^11.1.0`** is the most conservative "modern & non-deprecated-for-CVE" choice: it is
  past the CVE-2025-64756 fix and keeps the CLI bundled in the same package (no
  `glob-bin` split), while requiring Node ≥ 20 (already satisfied by Next.js 16).
- **`^13.0.6`** (current `latest`) is also API-safe for Jest's *library* usage, but note
  v13 moves the CLI to a separate `glob-bin` package. Jest doesn't use the glob CLI, so
  this is fine — but `^11.1.0` is the lower-risk pick if you want to change as little as
  possible. (Both `11.1.0` and `13.x` still carry the maintainer's blanket "old versions"
  text on *older* releases, but the resolved `11.1.0`/`13.x` versions themselves are the
  current supported lines and will not emit the deprecation warning.)

After adding it:

```bash
rm -rf node_modules package-lock.json   # or: npm install against a clean lock
npm install
npm ls glob     # confirm the 10.5.0 branch now resolves to the override (11.x/13.x)
npm test        # MUST pass — verify Jest reporters/config/runtime still work
```

`npm test` is the only real regression surface; it must pass before merging.

> Unlike the sibling **glob@7** ticket — where overriding `glob` directly is **unsafe**
> because `test-exclude@6` is written against the removed v7 API — here overriding `glob`
> directly **is** the correct, safe approach, precisely because v10 and v11/v13 share the
> same modern API.

## Effort / Priority

- **Priority: Low** (informational). No production exposure; the referenced CVE is
  already patched in-tree and is CLI-only/unreachable; the warning is a blanket "old
  major" notice.
- **Effort:**
  - Do-nothing / track upstream: **~0** (re-bump `jest` on a future release).
  - Optional `overrides` bump + verify tests: **~10–20 min** (add block, clean
    reinstall, run `npm test`).
- **Suggested disposition:** Leave as-is and revisit when bumping Jest; apply the
  `"glob": "^11.1.0"` override only if the install-time warning needs to be silenced for
  CI hygiene.

---

### References

- CVE-2025-64756 / GHSA-5j98-mcp5-4vw2 (glob CLI command injection, patched in 10.5.0 &
  11.1.0) — https://github.com/advisories/GHSA-5j98-mcp5-4vw2
- glob changelog (v11 drops Node < 20; v12 removes `--shell`; v13 extracts CLI to
  `glob-bin`) — https://github.com/isaacs/node-glob/blob/main/changelog.md
- glob on npm (latest = 13.0.6; `legacy-v10` dist-tag = 10.5.0) —
  https://www.npmjs.com/package/glob

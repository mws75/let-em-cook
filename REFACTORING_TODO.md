# Refactoring TODO — Code-Review Hardening

Refactoring backlog to bring the codebase to a clean senior-level review bar,
based on the 2026-06-20 review of the food-lookup feature plus issues noticed
while working across the repo.

> Separate from the product checklist in `TODO.md` (features) on purpose.
> Items are scoped with file references and rough effort (S/M/L).

Existing tracking docs this complements (avoid duplicating them):
- `docs/Feat/Daily Tracker - Followup Cleanups.md` — schema drift, obsolete
  QuickLog paths, pre-existing test-infra issues.
- `docs/00- TODO.md` — product/feature backlog.
- `docs/Feat/Feat - Food Database Lookup.md` §13.7 — deferred food-lookup features.

---

## 1. Food Lookup feature — review follow-ups

Low-priority items deferred from the senior review (the high/medium items —
weight double-count, resolve nutrient bug, error-vs-empty, branded exclusion,
cache removal — were already fixed).

- [x] **(S) Guard `parseFoodQuery` against divide-by-zero.** ~~`"1/0 cup"` yields
  `qty: Infinity`.~~ Done — non-finite/non-positive quantities clamp to 1
  (`src/lib/foods/parseQuery.ts`), with a regression test.
- [x] **(S) Tighten `matchServing` matching.** ~~Substring match means `"large"`
  also matches `"extra large"`.~~ Done — exact unit → whole-word → substring
  fallback (`src/lib/foods/parseQuery.ts`), with a regression test.
- [x] **(S) Clean up the `withTimeout` abort listener.** Done — named listener
  added with `{ once: true }` and removed in `clear()` (`src/lib/foods/usda.ts`).
- [x] **(S) Forward an `AbortSignal` from the search route to `searchFoods`.**
  Done — `searchFoods(q, request.signal)` so a client disconnect cancels the
  USDA fetch (`src/app/api/foods/search/route.ts`).
- [ ] **(M) Decide how food search interacts with `ltc_api_usage`.** Every
  debounced search records a usage row and there's no prune job (the table's own
  comment in `migrations/003_api_rate_limits.sql` calls for one). Options:
  exclude GET search from the usage log, use a lighter limiter, and/or add a
  scheduled prune for rows older than 7 days.
- [ ] **(M) Add a Foods-tab interaction test.** Nothing covers the weight-quantity
  serving math fixed in review (`"100g"`, `"8 oz"` → multiplier carries grams).
  Render `TrackerLogModal` with testing-library and assert the prefilled macros.
- [x] **(S) USDA energy-nutrient fallback.** ~~Some Foundation foods report energy
  under Atwater numbers (957/958) rather than 208 — add a fallback so calories
  aren't null for those.~~ Done — `energyKcal()` prefers 208, then 957, then 958
  (`src/lib/foods/usda.ts`), with a regression test. Surfaced by a live Fuji-apple
  lookup returning null calories.
- [~] **(S) Optional USDA search relevance.** ~~Consider `&sortBy=dataType.keyword`
  so whole-food matches rank predictably.~~ Partly addressed: branded foods were
  re-enabled with a whole-foods-first merge of two parallel queries (§13.5.1), so
  branded no longer buries whole foods. Still open: within the whole-food list
  USDA's own relevance ranks oddly (e.g. "Apples, raw" below "Croissants, apple")
  — a query-side tweak or client re-rank could improve it. `src/lib/foods/usda.ts`.
- [ ] **(S) Accessibility on the Foods tab.** Search input needs a visible/`aria`
  label; the results list could use proper roles.
  `src/components/TrackerLogModal.tsx`.
- [ ] **(S) Mobile auth parity (when the iOS app uses this).** The web modal
  relies on Clerk cookies; `/api/foods/search` also accepts the mobile Bearer
  token, but the Swift client must send it. Track with the iOS rebuild.

---

## 2. Pre-existing issues surfaced while building this feature

Not caused by the food-lookup work, but they undercut a clean review and were
visible in the files I touched.

- [ ] **(M) Get ESLint to green / gate it in CI.** `npx eslint` reports errors at
  HEAD that the build apparently tolerates — e.g. `react-hooks/set-state-in-effect`
  in `DailyTracker.tsx` / `TrackerLogModal.tsx`, and `Cannot access 'clearForm'
  before it is declared`. Decide the intended rule set, fix or `eslint-disable`
  with justification, then wire `next lint` into CI so new errors can't land.
- [ ] **(S) Remove unused `fieldClass` in `TrackerLogModal.tsx`.** Dead `const`
  flagged by lint.
- [ ] **(M) Fix missing style-guide build deps.** `tsc` errors on
  `@uiw/react-codemirror`, `@codemirror/lang-css`, `@uiw/codemirror-theme-github`
  imported by `src/app/style-guide/page.tsx` but not installed. Install them or
  gate/remove the page so `tsc --noEmit` is clean.
- [ ] **(S) Fix `src/lib/openai.test.ts` type errors.** Mocks aren't typed to the
  current `openai` SDK (`Headers` arg; `new` with no construct signature).
- [ ] **(S) Add `/** @jest-environment node */` to the failing route tests.**
  `check-valid-ingredients/route.test.ts` and
  `check-valid-instructions/route.test.ts` fail under jsdom (`Request` undefined).

---

## 3. Testing & tooling baseline

- [ ] **(M) Make `tsc --noEmit` clean repo-wide**, then gate it in CI (blocked
  today only by §2 items).
- [ ] **(M) Make the full `jest` suite green and gate it** (several pre-existing
  suites fail; see §2).
- [ ] **(S) Add `.env.example` / README env docs.** Document `USDA_API_KEY` plus
  existing `DATABASE_*`, Clerk, OpenAI, Stripe, Resend vars so onboarding doesn't
  require grepping `process.env`.

---

## 4. Housekeeping already tracked elsewhere (do not duplicate)

- [ ] Reconcile `src/db/schema.sql` with the live DB (drops/renames, missing
  `ltc_meal_plans`). → Daily Tracker followup doc.
- [ ] Remove obsolete QuickLog code paths once safe. → Daily Tracker followup doc.
- [ ] iOS reference-app rebuild to match the new tracker architecture.
  → Daily Tracker followup doc.

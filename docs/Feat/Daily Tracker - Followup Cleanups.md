# Daily Tracker — Follow-up Cleanups

Tracking small chores discovered during the Daily Macro Tracker build. Pick these up **after** the feature ships.

## Schema drift in `src/db/schema.sql`

The file is out of sync with the live database. It still defines tables/columns that migration `001_simplify_schema.sql` dropped or renamed, and it omits a table that the code actively reads/writes.

Specifically, `schema.sql` should be updated to:

1. **Drop `ltc_emojis`** — removed in migration 001.
2. **Drop `ltc_macros_cache`** — removed in migration 001.
3. **Update `ltc_recipes`:**
   - Rename `num_servings` → `servings`.
   - Drop `emoji_id` column and `ix_recipes_emoji` index.
   - Add the columns introduced in migration 001:
     `per_serving_calories`, `per_serving_protein_g`, `per_serving_fat_g`,
     `per_serving_carbs_g`, `per_serving_sugar_g`, `emoji`, `tags_json`,
     `active_time_min`, `total_time_min`.
4. **Add `ltc_meal_plans`** — referenced by `src/lib/database/mealPlans.ts` (`upsertMealPlan` etc.) but missing from `schema.sql`. Need to read the live DB or recover the original DDL to capture the exact column shape.

This is a docs-only cleanup — the live PlanetScale schema is already correct. The risk is that anyone bootstrapping a fresh DB from `schema.sql` would get a wrong snapshot.

## Suggested approach

- One PR, schema-only, after the Daily Tracker ships.
- Validate by `mysqldump --no-data` against the live DB and diffing against the rewritten `schema.sql`.

## Obsolete QuickLog code paths

After step 10, `Calendar.tsx` no longer creates or renders Quick Log entries. The following are now **unused** and can be deleted in a follow-up cleanup PR once the Daily Tracker has been live in production for a release or two:

1. **`src/components/QuickLogModal.tsx`** — the legacy modal. `TrackerLogModal.tsx` is the spiritual successor and the only Quick-Log-style modal we ship now.
2. **`QuickLogEntry` type** in `src/types/types.ts` — only referenced by the legacy modal and the optional `quickLogs?` field on `MealSlotData`.
3. **`MealSlotData.quickLogs?`** — currently optional for backward-compat with any old DB rows that have `quickLogs: [...]` baked in. Once we're confident no live data has that field, drop the field from the type entirely.

Order matters: don't delete `QuickLogEntry` until both the modal and the `MealSlotData` field are gone.

## Pre-existing test infrastructure issues (now partly fixed)

While adding tests for the Daily Tracker we discovered several pre-existing problems in the test setup. The Tracker work fixed some incidentally — listing the rest here.

**Fixed during step 12:**
- Installed `jest-environment-jsdom` and `@testing-library/jest-dom` (referenced by `jest.config.js` / `jest.setup.js` but absent from `node_modules`).
- Installed `@types/jest` so `tsc --noEmit` stops complaining about test-file globals.

**Still broken (worth a small follow-up):**
1. **`src/app/api/check-valid-ingredients/route.test.ts`** and **`src/app/api/check-valid-instructions/route.test.ts`** fail because Next.js's `Request` global isn't defined in jsdom. Same fix used on the new route tests will work — add a `/** @jest-environment node */` doc comment at the top of each file.
2. **`src/lib/openai.test.ts`** has type errors (`Argument of type '{}' is not assignable to parameter of type 'Headers'` and a `new` expression with no construct signature). The mocks aren't typed to the current `openai` SDK. Either tighten the mocks or use `as unknown as Headers` casts.

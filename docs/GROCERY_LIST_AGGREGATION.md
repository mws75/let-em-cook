# Grocery List Aggregation

How the grocery list is generated when a user clicks **Generate Grocery List** on
the dashboard, and where each cleanup step lives so you can revert or tune any
one of them in isolation.

## End-to-end flow

1. **`src/app/dashboard/page.tsx` — `generateGroceryList`** flattens every
   ingredient from every selected recipe into one array and POSTs it to
   `/api/sort-grocery-list`.
2. **`src/app/api/sort-grocery-list/route.ts`** runs aggregation, formats each
   resulting `GroceryItem` into a display string, asks OpenAI to sort those
   strings by grocery-store section, then maps the sorted strings back to
   `GroceryItem[]` via a lookup map.
3. **`src/lib/ingredientAggregator.ts` — `aggregateIngredients`** is the core
   logic: normalize names, group, sub-group by unit type, sum, produce
   `GroceryItem[]`.
4. **`src/lib/unitConverter.ts`** owns unit normalization (synonyms, plurals),
   unit-type classification, conversions between volume/weight units, and the
   quantity formatter.
5. **Dashboard renders** each `GroceryItem` through `formatGroceryItemDisplay`
   which applies the same display rules as the route's formatter.

Before this pass the raw output included duplicates like `Onion` / `Yellow
onion`, plural/singular splits (`Green onion` vs `Green onions`), typos
(`Chilli` vs `Chili`, `Miron`, `Edame`), prep notes baked into names
(`Cooked Black Beans`, `Lettuce, Chopped`), five separate `Salt` rows, and the
literal word `each` in front of countable items. The five steps below address
those in order.

---

## Step 1 — Normalize ingredient name

**File:** `src/lib/ingredientAggregator.ts`
**Functions:** `normalizeIngredientName`, `cleanName`, `stripAfterComma`,
`stripPrepAdjectives`, `singularizeWord`, `applyTypoMap`

`normalizeIngredientName` is the key used to group ingredients. It runs these
passes on the original name:

1. Lowercase + trim.
2. Drop everything after the first comma (`"Lettuce, Chopped"` → `"Lettuce"`).
3. Apply `TYPO_MAP` per token (`miron` → `mirin`, `edame` → `edamame`,
   `romain` → `romaine`, `montery` → `monterey`, `chilli`/`chile` → `chili`,
   `tomatos` → `tomatoes`).
4. Strip prep adjectives from anywhere in the string using word-boundary
   regexes. The list lives in `PREP_ADJECTIVES` and is sorted longest-first so
   `"thinly sliced"` matches before `"sliced"`.
5. Replace `-` `_` `/` with spaces so `"bok-choy"` and `"bok choy"` collapse.
   Strip apostrophes (including curly `’`).
6. Collapse whitespace.
7. Singularize each token: `ies`→`y`, `ves`→`f`, `oes`→`o`, `ches/shes/sses/xes/zes`→strip `es`,
   plain trailing `s`→strip (but not `ss` / `us` / `is`).

`cleanName` is the same pipeline minus the singularization — used to build the
display name so we don't show `"Potato"` when the user typed `"Potatoes"`.

**What this fixes in the sample list**

| Before                                    | After (same group)   |
| ----------------------------------------- | -------------------- |
| `Potatoes`, `Tiny potatoes`               | still 2 groups (tiny is specific) |
| `Bok-choy`, `Bok choy`                    | one group `bok choy` |
| `Green onion`, `Green onions`             | one group `green onion` |
| `Persian cucumbers` / `Cucumber`          | stays 2 groups (persian = variety) |
| `Cooked Black Beans` / `Black Beans`      | one group `black bean` |
| `Lettuce, Chopped`                        | `lettuce` |
| `Toasted sesame seeds` / `Sesame seeds`   | one group `sesame seed` |
| `Chilli oil` / `Chili oil`                | one group `chili oil` |
| `Miron` / `Mirin`                         | one group `mirin` |

**Deliberately NOT merged** — color/variety adjectives: `Red Bell Pepper` vs
`Green Bell Pepper`, `White Onion` vs `Yellow Onion`. Those are distinct
shopping decisions; the normalizer preserves them.

**To revert / tune this step**

- To turn it off entirely: replace `normalizeIngredientName`'s body with
  `return name.toLowerCase().trim();` (the original behavior).
- To disable only prep-adjective stripping: empty the `PREP_ADJECTIVES` array
  or make `stripPrepAdjectives` return its input unchanged.
- To disable singularization: make `singularizeWord` return its input
  unchanged. This is the highest-risk pass since it can wrongly stem an
  irregular word.
- To add more typos/synonyms: append to `TYPO_MAP`.

**Known gaps**

- Doesn't know that `Chicken Thighs` / `Chicken Tenders` / `Chicken` might be
  one shopping trip. Adjective-prefixed names stay distinct by design.
- Doesn't stem adjectives themselves (`chopped` is stripped; `chopping` is
  not — doesn't currently come up in real data).

---

## Step 2 — Normalize units

**File:** `src/lib/unitConverter.ts`
**Functions:** `normalizeUnit`, `getUnitType`, and all conversion helpers
(all now call `normalizeUnit` internally)

`normalizeUnit` collapses plurals and synonyms to one canonical token before
any lookup:

- Plurals: `cups` → `cup`, `tbsps` → `tbsp`, `lbs` → `lb`, `grams` → `g`,
  `cloves` → `clove`, `heads` → `head`, `leaves` → `leaf`, `pcs` → `pc`, etc.
- Spelled-out variants: `teaspoon`/`teaspoons` → `tsp`, `pound`/`pounds` →
  `lb`, `milliliter`/`milliliters` → `ml`, `package`/`packages` → `pkg`.
- Synonymous count units added to `COUNT_UNITS`: `knob`, `bar`, `block`,
  `package`, `bottle`, `jar` — so `"1 knob Ginger"` and `"1 block Tofu"` are
  classified as `count` and can merge with other count-unit entries.

The map lives in `UNIT_SYNONYMS`; all conversion / classification functions
go through `normalizeUnit` so adding an entry ripples through aggregation,
display, and the OpenAI-sort formatter automatically.

**What this fixes**

- `2 heads Bok-choy` + `1/2 each Bok choy` now aggregate (both are `count`,
  both resolve to known count units after normalization).
- `Cups` / `cup`, `lbs` / `lb`, `cloves` / `clove` don't split into separate
  rows in `chooseDisplayUnit`.

**To revert / tune**

- Empty the `UNIT_SYNONYMS` map to disable unit normalization entirely (the
  original behavior).
- Remove an entry from `COUNT_UNITS` to force a specific unit back into the
  `"other"` bucket (ingredients in `"other"` don't aggregate across recipes).

**Known gaps**

- `pkg` vs `block` vs `bar` are all valid `count` units but don't map to each
  other. If you want `1 pkg Tofu + 1 block Tofu + 1 bar Tofu` to say `3 Tofu`,
  add `block: "pkg"` and `bar: "pkg"` to `UNIT_SYNONYMS` — skipped for now
  because they're genuinely different sizes in many recipes.
- Mixed unit types on the same ingredient still produce multiple rows (e.g.
  `Onion` as `cup` + `each`). See "Known limitations" below.

---

## Step 3 — Sum ingredients with normalized units

**File:** `src/lib/ingredientAggregator.ts` (the `for...of byUnitType` loop)

With steps 1 and 2 in place this mostly "just works", but there's one extra
fix here: the handling of the `other` unit-type bucket.

**Old behavior:** every `other`-typed ingredient (any ingredient with an
unknown or empty unit, like `Salt` with no quantity) was pushed as its own
`GroceryItem`. Five recipes with `Salt` → five `Salt` rows.

**New behavior:** inside the `other` bucket, sub-group by the normalized unit
string. Items that share both a name and a unit merge. Items whose unit is
empty (`""`) and whose quantity is `0` collapse into one entry displayed as
`Salt (to taste)`.

**To revert**

- Replace the `other` branch with the single-loop push version (`for (const
  item of subItems) { results.push({...}); continue; }`) to restore the
  per-occurrence behavior.

---

## Step 4 — Capitalize for display

**File:** `src/lib/ingredientAggregator.ts`
**Functions:** `buildDisplayName`, `titleCase`, `cleanName`

Once a group is formed, `buildDisplayName` picks the display string:

1. Look for an original name whose first letter is uppercase (preserves the
   user's intent when they typed `Yellow Onion` vs `yellow onion`).
2. Run it through `cleanName` (same pipeline as normalization, minus
   singularization) to strip prep notes and comma-clauses.
3. Title-case the result.
4. If no original has a capital first letter, fall back to title-casing a
   cleaned version of the first-seen original.

**To revert**

- Replace the body of `buildDisplayName` with the original heuristic:
  `items.find((i) => i.name[0] === i.name[0].toUpperCase())?.name || capitalizeFirst(normalizedName);`

---

## Step 5 — Hide "each" in display

**File:** `src/lib/unitConverter.ts` (`shouldHideUnitOnDisplay`,
`HIDDEN_DISPLAY_UNITS`)
**Call sites:** `src/app/dashboard/page.tsx` (`formatGroceryItemDisplay`),
`src/app/api/sort-grocery-list/route.ts` (the `formattedForSorting` map)

`"each"` is a valid count unit internally — it lets the aggregator combine
`"2 each apples"` across recipes — but showing it to the user reads oddly
(`3 each Potatoes`). `HIDDEN_DISPLAY_UNITS = { "each", "pc", "piece" }` plus
`shouldHideUnitOnDisplay(unit)` lets display formatters omit the unit for
these count-placeholder tokens.

Both display formatters (dashboard and route) now share the same rule:

- If there's a quantity AND the unit is not hidden → `"3 cups Flour"`.
- If there's a quantity and the unit IS hidden → `"3 Potatoes"`.
- If there's no quantity and the unit is `"to taste"` → `"Salt (to taste)"`.
- Otherwise → just the name.

Keeping the two formatters in lockstep matters because `sort-grocery-list`
builds a string → `GroceryItem` lookup map (`route.ts` lookup after OpenAI
returns) and a mismatch would break the sort.

**To revert**

- Empty `HIDDEN_DISPLAY_UNITS` or make `shouldHideUnitOnDisplay` always return
  `false`. The word `each` will come back in the display.
- If you want to hide more units (e.g. `"pkg"`), add them to
  `HIDDEN_DISPLAY_UNITS`.

---

## Sample: before vs after

Input (excerpt from the noisy list we saw on 2026-04-24):

```
1 1/2 each Onion
1 3/4 cup Onion
3 1/2 each Potatoes
6 each Carrots
Salt
Salt
Salt
Salt
Salt
2 heads Bok-choy
1/2 each Bok choy
Cooked Black Beans
Lettuce, Chopped
```

Expected after (ordering comes from the OpenAI sort step):

```
1 3/4 cup Onion
1 1/2 Onion           # still a second row — see "Known limitations"
3 1/2 Potatoes
6 Carrots
Salt (to taste)
2 1/2 Bok Choy
Black Bean
Lettuce
```

---

## Known limitations / future work

- **Mixed unit types on one ingredient still produce multiple rows.** `Onion`
  with `cup` measurements stays a separate row from `Onion` with `each`
  measurements. The cleanest fix is to widen `GroceryItem` to carry an array
  of measurements and render them on one line (`Onion — 1¾ cup + 1½ whole`).
  That touches the type, the aggregator, both display formatters, and the
  OpenAI lookup map, so it's deferred.
- **`pkg` / `block` / `bar` don't converge** (Tofu example). Deferred — these
  mean different physical sizes in practice, and picking one would be wrong
  as often as right.
- **Chicken cuts** (`Chicken Thighs` / `Chicken Tenders` / `Chicken`) stay
  distinct. Probably correct; if not, handle it with a curated alias map
  rather than by stemming.
- **Hand-curated dictionaries don't scale.** `TYPO_MAP`, `PREP_ADJECTIVES`,
  `UNIT_SYNONYMS`, and `COUNT_UNITS` are grown manually. Planned: scheduled
  cron-triggered route that scans unanalyzed rows in the `recipes` table,
  surfaces unknown units / suspected typos / unknown prep adjectives to a
  review queue, and expands these maps once approved. Tracked in
  [00- TODO.md](./00-%20TODO.md) under **Grocery List Pipeline**.

## Touchpoints summary

| Concern                          | File                                         |
| -------------------------------- | -------------------------------------------- |
| Flatten selected recipes         | `src/app/dashboard/page.tsx` (`generateGroceryList`) |
| Aggregation pipeline             | `src/lib/ingredientAggregator.ts`            |
| Unit synonyms / classification   | `src/lib/unitConverter.ts`                   |
| OpenAI sort + string → item map  | `src/app/api/sort-grocery-list/route.ts`     |
| Display formatting (UI + sort)   | `page.tsx` + `route.ts` (same rules)         |
| Shared types                     | `src/types/types.ts` (`Ingredients`, `GroceryItem`, `UnitType`) |

# Feat — Food Database Lookup (Nutritionix + USDA fallback)

**Status:** Planning — for review before implementation
**Author / driver:** Michael
**Last updated:** 2026-05-01

---

## 1. Why this feature

The Daily Macro Tracker (`src/components/DailyTracker.tsx`) shipped with three logging modes via `TrackerLogModal`: **Recents → Recipe → Manual**. Recipes and Recents both work great when a user has built up a personal library, but the **first-time experience is brutal**: if a user wants to log "an apple" on day one, today they must either:

1. Create an "Apple" *recipe* with macros (overkill for a piece of fruit), or
2. Use **Manual entry** and type `Apple` plus `95 / 0 / 0 / 25 / 19` from memory — which most people simply don't know.

This is the friction that kills adoption. Every serious tracker (MyFitnessPal, Lose It, Cronometer) solves it the same way: **a searchable food database that prefills macros**, with the user free to adjust afterwards.

**Goal:** add a fourth mode — **Foods** — to `TrackerLogModal` that searches a real nutrition database, lets the user pick the right item and serving, and prefills the macro fields. Every field stays editable so a user with an XL apple can bump calories up.

### Design priorities

1. **Speed.** Search-as-you-type with debounce; tap a result and macros land in the form instantly.
2. **Accuracy by default, override on demand.** Database values are a starting point, not gospel. Editing must remain trivial.
3. **No vendor lock-in.** API layer is abstracted so we can swap providers without UI changes.
4. **Cost discipline.** Cache aggressively, snapshot into log entries, never re-fetch a known item unnecessarily.

---

## 2. Provider strategy

### 2.1 Why two providers

| Provider | Role | Why |
|---|---|---|
| **Nutritionix** | Primary | Best-in-class natural language ("1 large apple"), great branded coverage, fast search, the experience users expect from competitor apps. |
| **USDA FoodData Central** | Fallback | Free forever, no commercial restrictions, comprehensive whole-food coverage. Catches us when Nutritionix is rate-limited, down, or returns no results. |

Order of operations on every search:
1. Hit Nutritionix `/v2/search/instant`.
2. If it returns ≥ 1 result, render those.
3. If it returns 0 results **or** the request fails (rate-limited, 5xx, timeout), fall back to USDA `/v1/foods/search`.
4. The result list is tagged with the source so the UI can show a tiny `via USDA` chip on fallback rows (purely informational).

### 2.2 Nutritionix specifics

- **Endpoints used**
  - `GET /v2/search/instant?query=...` — autocomplete; returns `common` (generic foods) and `branded` (packaged products) arrays.
  - `POST /v2/natural/nutrients` — body `{ query: "1 large apple" }`. Returns full macros for a natural-language quantity. **This is the magic endpoint** — it's how we resolve a "common" food into actual numbers at the user's chosen serving.
  - `GET /v2/search/item?nix_item_id=...` — direct lookup for branded items by their stable id.
- **Auth:** two headers, `x-app-id` and `x-app-key`. Both go server-side only.
- **Rate limit (free tier):** 500 requests/day, ~2 req/sec. Our 3 active users won't get close. Plan upgrade ($50/mo) is well-covered by subs once we hit the ceiling.
- **Attribution:** free tier requires a visible "Powered by Nutritionix" badge linking to nutritionix.com on any screen showing their data. Removed when we upgrade.
- **Caching (per their ToS):** branded items (`nix_item_id`) cacheable indefinitely; natural-language / common-food responses should be refreshed within 24h. We'll honor this with a `cache_ttl` column (see §3.1).

### 2.3 USDA FoodData Central specifics

- **Endpoints used**
  - `GET /v1/foods/search?query=...&pageSize=20&dataType=Foundation,SR Legacy,Branded` — returns matched foods with `fdcId`.
  - `GET /v1/food/{fdcId}` — full nutrient breakdown for a chosen result.
- **Auth:** single `api_key` query param. Free, register at api.data.gov.
- **Rate limit:** 1000 req/hour per IP, raisable on request. Effectively non-binding for our scale.
- **Attribution:** none required.
- **Caching:** unrestricted.
- **Note on macros:** USDA returns nutrients per 100g; we normalize to per-serving when a `foodPortions` array is present, otherwise we let the user pick a serving size from their result.

### 2.4 Abstraction layer

A single internal interface so nothing in the UI knows which provider answered:

```ts
// src/lib/foods/provider.ts
export type FoodSource = "nutritionix" | "usda";

export type FoodSearchResult = {
  source: FoodSource;
  external_id: string;       // nix_item_id, "common:apple", or USDA fdcId as string
  name: string;              // "Apple, raw, with skin"
  brand?: string;            // "Honeycrisp" | "Nature Valley" | undefined
  default_serving_label: string; // "1 medium (182g)"
  default_serving_grams?: number;
  per_serving: {
    calories: number | null;
    protein_g: number | null;
    fat_g: number | null;
    carbs_g: number | null;
    sugar_g: number | null;
  };
  available_servings?: ServingOption[]; // multiple portion options if provider supplied
};

export type ServingOption = {
  label: string;          // "1 medium", "1 cup, sliced", "100 g"
  grams: number;
  qty: number;            // 1 (for "1 medium"), 100 (for "100 g")
  unit: string;           // "medium", "cup, sliced", "g"
};

export interface FoodProvider {
  search(query: string, signal?: AbortSignal): Promise<FoodSearchResult[]>;
  resolve(
    result: FoodSearchResult,
    serving: ServingOption,
    qty: number
  ): Promise<FoodSearchResult>;
}
```

Two implementations: `NutritionixProvider`, `UsdaProvider`. A thin `searchFoods()` orchestrator runs Nutritionix first and falls back to USDA on empty/error.

---

## 3. Data model

### 3.1 New table: `ltc_food_cache`

Caches resolved food lookups to keep our Nutritionix quota intact and make Recents fast. One row per `(source, external_id)`.

```sql
CREATE TABLE IF NOT EXISTS ltc_food_cache (
  cache_id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source             VARCHAR(32)     NOT NULL,
  external_id        VARCHAR(128)    NOT NULL,
  name               VARCHAR(255)    NOT NULL,
  brand              VARCHAR(255)    NULL,
  default_serving    VARCHAR(128)    NOT NULL,
  servings_json      JSON            NULL,
  per_100g_json      JSON            NULL,
  per_serving_json   JSON            NOT NULL,
  fetched_on         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cache_ttl_hours    INT UNSIGNED    NOT NULL DEFAULT 24,
  PRIMARY KEY (cache_id),
  UNIQUE KEY ux_food_cache_source_id (source, external_id),
  KEY ix_food_cache_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Why a separate table (not just per-user):** food data is global, not user-specific. One user logging "Honeycrisp apple" should warm the cache for all users.

**`cache_ttl_hours`**: 8760 (1 year) for branded Nutritionix items and all USDA items, 24 for Nutritionix common foods (per their ToS). On read, we check `fetched_on + cache_ttl_hours < NOW()` and re-fetch if stale.

### 3.2 Extending `DailyLogEntry`

The existing entry shape (defined in `src/types/types.ts`) currently has `kind: "recipe" | "manual"`. We add a third:

```ts
export type DailyLogEntry = {
  id: string;
  slot: DailySlot;
  kind: "recipe" | "manual" | "food";   // ← new "food"
  recipe_id?: number;
  food_source?: FoodSource;             // ← new, set when kind === "food"
  food_external_id?: string;            // ← new, set when kind === "food"
  name: string;
  servings: number;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sugar_g: number | null;
  logged_at: string;
};
```

**Macros are still snapshotted into the entry itself** — exactly as we do for `kind: "recipe"`. This means:
- Old logs survive cache eviction.
- Edits the user made (their apple was big) persist.
- Recents derivation works without re-hitting any API.

`food_source` + `food_external_id` are kept for two reasons:
1. **Re-log shortcut** — when the user picks an entry from Recents, we can offer "use the database value again" to undo any prior overrides.
2. **Analytics** — see which providers are pulling weight; spot quota concerns early.

### 3.3 No changes to `ltc_daily_logs` or `ltc_users`

The food-lookup feature rides entirely on top of the existing daily-log infrastructure. Goals, daily-log API, week strip — all untouched.

---

## 4. API surface

New routes under `src/app/api/foods/`:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/foods/search?q=...` | Search foods (Nutritionix → USDA fallback). Returns `FoodSearchResult[]` with cache-warmed results. |
| `POST` | `/api/foods/resolve` | Body `{ source, external_id, serving, qty }` → returns a fully-resolved `FoodSearchResult` with macros for that exact serving × qty. Used when the user changes serving size in the modal. |

**Why `POST` for resolve:** payload includes a structured `serving` object; cleaner than a long querystring.

Both routes:
- Run server-side only (API keys never reach the browser).
- Check `ltc_food_cache` first; on hit, skip the provider call entirely.
- On miss, fetch → write through to cache → return.

DB layer (`src/lib/database/foodCache.ts`):

```ts
export async function getFoodCacheEntry(source: FoodSource, externalId: string): Promise<CachedFood | null>;
export async function upsertFoodCacheEntry(entry: CachedFood): Promise<void>;
```

Provider layer (`src/lib/foods/`):
- `provider.ts` — interface + types (shown above).
- `nutritionix.ts` — implements `FoodProvider`.
- `usda.ts` — implements `FoodProvider`.
- `searchFoods.ts` — orchestrator with the fallback logic.

### 4.1 Environment variables

Add to `.env.local` and Vercel:

```
NUTRITIONIX_APP_ID=...
NUTRITIONIX_APP_KEY=...
USDA_API_KEY=...
```

All three are server-only. Document in `README` or wherever app env is described.

### 4.2 Rate-limit guardrails

Even with 3 users, build the brakes once and forget about them:
- **Per-user debounce** at the UI layer: 300ms after last keystroke before firing search.
- **Server-side dedupe:** in-memory LRU keyed by query string, 60-second TTL. Identical search within a minute returns the prior response.
- **Daily quota tracking:** simple counter row (or KV) so we know when we're approaching 500/day. When we cross 80%, flip a server flag that forces USDA-first for the rest of the day.

---

## 5. UI / UX design

### 5.1 New tab in `TrackerLogModal`

The modal currently has three modes: `"recents" | "recipe" | "manual"`. We add `"foods"` and reorder for the most useful default:

| Tab order (today) | Tab order (proposed) |
|---|---|
| Recents → Recipe → Manual | **Recents → Foods → Recipes → Manual** |

When the user opens the modal for the first time (no recents), default to **Foods** instead of Manual. After ~3 logs, **Recents** becomes the default again.

### 5.2 Foods tab layout

```
┌─ Modal ────────────────────────────────────────────────┐
│  Quick Log — Breakfast                                 │
│  [Recents]  [Foods]●  [Recipes]  [Manual]              │
├────────────────────────────────────────────────────────┤
│  🔍  apple|                                            │
│  ───────────────────────────────────────────────────── │
│  COMMON FOODS                                          │
│   🍎  Apple, raw                  1 medium · 95 cal    │
│   🍎  Apple, with skin            1 cup    · 65 cal    │
│  BRANDED                                               │
│   📦  Honeycrisp Apple — Stemilt  1 each   · 110 cal   │
│   📦  Apple Sauce — Mott's        4 oz     ·  60 cal   │
│  ───────────────────────────────────────────────────── │
│  Powered by Nutritionix ↗                              │
└────────────────────────────────────────────────────────┘
```

After tap → the result expands inline (or transitions to the existing "edit macros" form):

```
┌─ Modal ────────────────────────────────────────────────┐
│  Quick Log — Breakfast                                 │
│  [Recents]  [Foods]●  [Recipes]  [Manual]              │
├────────────────────────────────────────────────────────┤
│  🍎  Apple, raw                                  [✕]   │
│  Serving:  [ 1 medium (182g) ▼ ]   × [ – ] 1.0 [ + ]   │
│                                                        │
│  Calories  [ 95  ] cal     Protein  [ 0   ] g          │
│  Fat       [ 0   ] g       Carbs    [ 25  ] g          │
│  Sugar     [ 19  ] g                                   │
│  💡 Adjust any field if your apple was bigger/smaller. │
│                                                        │
│              [ Cancel ]   [ Add to Breakfast ]         │
└────────────────────────────────────────────────────────┘
```

### 5.3 Search behavior

- Debounce: 300ms after the last keystroke.
- Min query length: 2 chars (avoid blasting the API on every `a` keypress).
- Loading state: spinner inline next to the search input (don't block the modal).
- Empty-state copy: `"No matches. Try a different name, or use Manual to enter macros yourself."`
- Error state: `"Couldn't reach the food database. Try again, or use Manual."` — never show provider-internal error messages.

### 5.4 Serving + servings interplay

Two separate concepts, easy to confuse:

- **Serving size** (dropdown): "1 medium", "1 cup, sliced", "100 g". Switching this re-resolves macros via `/api/foods/resolve`.
- **Servings multiplier** (stepper): same as today's Recipe tab — `× 1.0`, `× 1.5`. Pure client-side multiplication; no API call.

Why both: a user might log "1 medium apple × 1.5" because they ate a big one, or they might log "100 g × 2" because they weighed it. Match how MyFitnessPal does it — most users will never touch the serving dropdown, but power users want it.

### 5.5 Attribution badge

A small chip pinned to the bottom of the Foods tab panel:

```html
<a href="https://www.nutritionix.com/" target="_blank" rel="noopener"
   class="inline-flex items-center gap-1.5 text-xs text-text-secondary
          hover:text-text px-2 py-1 rounded-md">
  <span>Powered by</span>
  <img src="/nutritionix-logo.svg" alt="Nutritionix" class="h-3.5" />
  <span aria-hidden="true">↗</span>
</a>
```

Only shown when results came from Nutritionix. Hidden on USDA-only result sets. Removed entirely when we upgrade to a paid Nutritionix tier.

### 5.6 Recents integration

When a user logs a food, it lands in their daily log with `kind: "food"` plus `food_source` and `food_external_id`. The Recents tab already derives from recent log entries (per the Daily Macro Tracker doc §3.5), so foods automatically populate there with **zero extra work** — no new API hit, all macros snapshotted.

A small badge on Recents rows (`🍎` for foods, `📖` for recipes, `✏️` for manual) helps distinguish them at a glance.

---

## 6. Implementation plan (step-by-step)

In dependency order so each step ships something runnable.

1. **Provider layer & types**
   - Create `src/lib/foods/provider.ts` with `FoodProvider`, `FoodSearchResult`, `ServingOption`, `FoodSource`.
   - Implement `src/lib/foods/nutritionix.ts` — `search()` and `resolve()` against `/v2/search/instant` and `/v2/natural/nutrients`.
   - Implement `src/lib/foods/usda.ts` — `search()` and `resolve()` against `/v1/foods/search` and `/v1/food/{fdcId}`.
   - Implement `src/lib/foods/searchFoods.ts` orchestrator with fallback.

2. **Cache table & DB layer**
   - Add `ltc_food_cache` to `src/db/schema.sql`.
   - Write `migrations/003_food_cache.sql`.
   - Create `src/lib/database/foodCache.ts` — `getFoodCacheEntry`, `upsertFoodCacheEntry`.
   - Wire cache reads/writes into the provider orchestrator (cache before fetch, write-through after fetch).

3. **API routes**
   - `src/app/api/foods/search/route.ts` — GET, debounced/dedupe'd, cached, fallback'd.
   - `src/app/api/foods/resolve/route.ts` — POST.
   - Add `NUTRITIONIX_APP_ID`, `NUTRITIONIX_APP_KEY`, `USDA_API_KEY` to env handling.

4. **Type extensions**
   - Add `kind: "food"`, `food_source`, `food_external_id` to `DailyLogEntry` in `src/types/types.ts`.

5. **`TrackerLogModal` — Foods tab**
   - Add the new tab between Recents and Recipe.
   - Search input with 300ms debounce + min-length 2.
   - Result list grouped by Common / Branded (Nutritionix shape) or flat list (USDA shape).
   - Tap → resolve macros → prefill the existing macro fields.
   - Serving dropdown that re-calls `/api/foods/resolve`.
   - Attribution chip at the bottom of the panel when results came from Nutritionix.

6. **Recents row badges**
   - Tiny visual indicator in Recents (`🍎` for foods, `📖` for recipes, `✏️` for manual) so users can tell them apart.

7. **Rate-limit guardrails**
   - Server-side LRU dedupe (60s TTL).
   - Daily quota counter; flip USDA-first mode at 80% of quota.

8. **Tests**
   - Unit: provider response normalization (Nutritionix shape → `FoodSearchResult`, USDA shape → `FoodSearchResult`).
   - Unit: orchestrator fallback (mock Nutritionix returning empty / 429 / 5xx → assert USDA called).
   - Unit: cache hit path (no provider call when cache fresh).
   - Integration: `/api/foods/search` and `/api/foods/resolve` end-to-end against mocked providers.

9. **Mobile pass**
   - Foods tab list must scroll inside the modal, not break the bottom-sheet layout on phones.
   - Search input gets `inputMode="search"` and `autoCapitalize="none"`.

10. **Docs**
    - Add a short section to the README describing the env vars and how to register for keys.
    - Update `Daily Tracker - Followup Cleanups.md` if any items become obsolete.

---

## 7. Migration file (draft)

```sql
-- migrations/003_food_cache.sql

USE `one-offs-v2`;

CREATE TABLE IF NOT EXISTS ltc_food_cache (
  cache_id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source             VARCHAR(32)     NOT NULL,
  external_id        VARCHAR(128)    NOT NULL,
  name               VARCHAR(255)    NOT NULL,
  brand              VARCHAR(255)    NULL,
  default_serving    VARCHAR(128)    NOT NULL,
  servings_json      JSON            NULL,
  per_100g_json      JSON            NULL,
  per_serving_json   JSON            NOT NULL,
  fetched_on         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cache_ttl_hours    INT UNSIGNED    NOT NULL DEFAULT 24,
  PRIMARY KEY (cache_id),
  UNIQUE KEY ux_food_cache_source_id (source, external_id),
  KEY ix_food_cache_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

No `ltc_daily_logs` or `ltc_users` changes. The new fields on `DailyLogEntry` are JSON-blob additions inside `entries_json`, so no schema migration is needed for those.

---

## 8. Decisions (locked 2026-05-01)

| # | Question | Decision |
|---|---|---|
| 1 | Primary provider | **Nutritionix** — natural language search is the experience users expect. |
| 2 | Fallback provider | **USDA FoodData Central** — free, no commercial restrictions, good whole-food coverage. |
| 3 | Where the search lives | **New `"foods"` tab inside `TrackerLogModal`** — reuse, not a new modal. |
| 4 | Caching | **Server-side `ltc_food_cache` table** — global cache keyed by `(source, external_id)`. Branded/USDA rows get long TTL; Nutritionix common foods get 24h per their ToS. |
| 5 | Macros snapshot in entries | **Yes** — same as recipe entries today. Survives cache eviction and preserves user overrides. |
| 6 | Attribution | **"Powered by Nutritionix" chip** at the bottom of the Foods tab when results came from Nutritionix. Removed when we upgrade the plan. |
| 7 | Default tab on first open | **Foods** when there are no recents; **Recents** thereafter. |
| 8 | Servings UX | **Two controls** — serving dropdown (re-resolves via API) + servings multiplier (client-side math). Matches MyFitnessPal. |

---

## 9. Deferred / open questions

These are explicitly *not* v1, but worth listing so we don't forget them.

1. **Personal food overrides** — when a user adjusts an apple's macros to "their apple", should we offer to remember that override and auto-apply next time they pick that food? Nice-to-have. Defer until we see whether users actually adjust often.
2. **Barcode scan** — Open Food Facts has the best barcode coverage. A future mobile feature could plug in as a third provider. The `FoodProvider` interface already supports this.
3. **Recipe import from a food** — "I just searched for 'chicken parmesan' and want to save this as a recipe template." Possible follow-up; out of scope here.
4. **Voice / photo logging** — Nutritionix has a beta NLP endpoint that accepts entire meal sentences ("I had a turkey sandwich and an apple"). Tempting but not v1.
5. **Nutritionix plan upgrade trigger** — when do we cross from free to paid? Probably when daily quota crosses 80% on three consecutive days, or when subs cover the $50/mo. Decide then, not now.

---

## 10. PlanetScale compatibility note

The schema in §3.1 and migration in §7 use `PRIMARY KEY` and regular `KEY` (index) clauses, with no `FOREIGN KEY` constraints — matching the pattern in existing tables (`ltc_recipes`, `ltc_meal_plans`, `ltc_daily_logs`).

- Primary key present (required by Vitess for sharding).
- No foreign keys; referential integrity enforced at the application layer.
- `JSON` columns work on PlanetScale exactly as on stock MySQL 8.

Safe to apply.

---

## 11. Sources / further reading

- [Nutritionix API Docs](https://docs.x.nutritionix.com/) — endpoint reference, rate limits, attribution rules.
- [Nutritionix Pricing & Plans](https://www.nutritionix.com/business/api) — free tier limits and paid plan thresholds.
- [USDA FoodData Central API](https://fdc.nal.usda.gov/api-guide.html) — endpoint reference, key registration.
- [api.data.gov rate limits](https://api.data.gov/docs/rate-limits/) — applies to USDA endpoints.
- [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/) — kept here for the future barcode follow-up.
- [MyFitnessPal — UX Case Study (Tradecraft)](https://medium.com/tradecraft-traction/myfitnesspal-a-ux-case-study-f377ff66a504) — same source as the Daily Tracker doc; informed the search UX choices.

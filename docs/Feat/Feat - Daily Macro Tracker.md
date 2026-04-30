# Feat — Daily Macro Tracker (split from Meal Planning Calendar)

**Status:** Planning — for review before implementation
**Author / driver:** Michael
**Last updated:** 2026-04-30

---

## 1. Why this feature

Today the Meal Planning Calendar (`src/components/Calendar.tsx`) does **two jobs at once**:

1. **Meal prep planning** — drag/drop recipes into a 7×3 grid for the upcoming week, with a side total of macros so a user can prep groceries.
2. **Daily macro tracking** — Quick Log lets users add ad-hoc meals into the same grid, doubling as a calorie/macro diary.

These are different mental models. Prepping is *future-looking and aspirational* ("what do I want to eat next week?"). Tracking is *retrospective and precise* ("what did I actually eat today?"). Cramming both into one calendar makes neither great:

- Prep view gets cluttered with one-off logs that don't repeat weekly.
- Tracking is awkward because the calendar is week-scoped, not day-scoped, and there's no fast day-to-day navigation.
- The "single row per slot" structure doesn't capture serving multipliers, time-of-day, or notes — all things real macro tracking needs.

**Goal:** ship the fastest, lowest-friction macro tracker on the market by reusing what we already have (recipe DB, Quick Log modal, drag-and-drop polish) and layering on a day-centric UI like the weekly day-strip pictured in the brief.

### Competitor pain points we're solving for

Research notes (see Sources at bottom):

- **MyFitnessPal:** users report logging takes more taps after recent redesigns, food diary is buried behind a "View All", per-meal macro breakdowns are hard to find, the app is slow, and "copy yesterday" / "copy single food" was removed or hidden.
- **Generic friction theme:** if logging takes >30 seconds per meal, users quit by week two. Speed beats precision.
- **What the best apps do:** multi-modal logging (search, voice, photo, copy), build a personal database of go-to meals, surface daily/weekly trends inline, and let users hit goals in ≤2 taps for repeat meals.

We already have the personal recipe DB. We have a Quick Log modal that auto-fills macros from a recipe. We just need to wire those into a day-shaped UI.

---

## 2. Scope split between the two features

| Concern | **Meal Planning Calendar** (existing, slimmed) | **Daily Macro Tracker** (new) |
|---|---|---|
| Mental model | "What's the prep plan for the week?" | "What did I eat today?" |
| Time scope | A week (Mon–Sun grid) | One day, with easy nav across days |
| Primary input | Drag recipes from palette into slots | Quick Log: search recipe, manual entry, copy yesterday, import from plan |
| Stored data | Meal plan blob (current `ltc_meal_plans`) | New `ltc_daily_logs` (one row per user per date) |
| Macros | Sum across the week, side panel for prep | Day-level totals + per-meal-slot totals + progress vs goals |
| Quick Log | **Removed** from the calendar (this is the open question — see §8). Quick Log lives in the tracker. | **Primary** entry path |
| Mobile | Secondary | Primary — must feel great on phone |

### What stays in the Calendar
- Recipe palette + drag/drop into Mon–Sun × Breakfast/Lunch/Dinner grid.
- Snacks row.
- Side macro readout per row + weekly average per day (still useful for prep — "this week averages 1900 kcal/day, am I prepping enough food?").
- Print view.

### What's new in the Tracker
- Weekly day-strip navigator (the screenshot reference).
- One-screen day view: 4 sections (Breakfast / Lunch / Dinner / Snacks).
- Macro progress vs daily goals (rings or bars).
- "Quick add" speed paths: recent foods, favorites, copy yesterday, import from meal plan for that date.
- Per-entry serving multiplier (`× 1.5`, `× 0.5`).
- Optional notes per entry (e.g., "ate at restaurant, estimated").

---

## 3. Data model

### 3.1 New table: `ltc_daily_logs`

One row per `(user_id, log_date)`. Entries are stored as a JSON array — same pattern we already use for `ltc_meal_plans` and recipe ingredients/instructions.

```sql
CREATE TABLE IF NOT EXISTS ltc_daily_logs (
  log_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  log_date        DATE            NOT NULL,
  entries_json    JSON            NOT NULL,
  notes           VARCHAR(500)    NULL,
  created_on      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  UNIQUE KEY ux_daily_logs_user_date (user_id, log_date),
  KEY ix_daily_logs_user (user_id),
  KEY ix_daily_logs_date (log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Why a unique key on `(user_id, log_date)`:** lets us `INSERT … ON DUPLICATE KEY UPDATE` for atomic upserts on a per-day basis. Same pattern as `upsertMealPlan`.

**Why JSON for entries:** matches the rest of the schema, lets us evolve the shape without migrations, and a single day's entries is small (almost always <10 items).

### 3.2 `entries_json` shape

```json
[
  {
    "id": "uuid-v4",
    "slot": "breakfast",
    "kind": "recipe",
    "recipe_id": 42,
    "name": "🍳 Eggs and toast",
    "servings": 1.0,
    "calories": 420,
    "protein_g": 28,
    "fat_g": 18,
    "carbs_g": 30,
    "sugar_g": 4,
    "logged_at": "2026-04-30T08:14:00Z"
  },
  {
    "id": "uuid-v4",
    "slot": "snack",
    "kind": "manual",
    "name": "Nature Valley granola bar",
    "servings": 1.0,
    "calories": 190,
    "protein_g": 4,
    "fat_g": 7,
    "carbs_g": 29,
    "sugar_g": 11,
    "logged_at": "2026-04-30T10:42:00Z"
  }
]
```

**Field notes:**
- `slot`: `"breakfast" | "lunch" | "dinner" | "snack"` — drives which section it renders in.
- `kind`: `"recipe"` (linked to a recipe row) or `"manual"` (free-form, like the current Quick Log manual mode).
- `recipe_id`: only set when `kind === "recipe"`. **We snapshot the macros into the entry itself** so historical logs don't drift if the user later edits or deletes the recipe.
- `servings`: multiplier — UI lets you bump `× 1.5` etc. Macros are the *post-multiplier* values to keep render math trivial.
- `logged_at`: ISO timestamp. Lets us show a small clock next to entries and sort within a slot. Optional client-side; defaults to now.

### 3.3 New TypeScript types (`src/types/types.ts` additions)

```ts
export const DAILY_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type DailySlot = (typeof DAILY_SLOTS)[number];

export type DailyLogEntry = {
  id: string;
  slot: DailySlot;
  kind: "recipe" | "manual";
  recipe_id?: number;
  name: string;
  servings: number;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sugar_g: number | null;
  logged_at: string; // ISO 8601
};

export type DailyLog = {
  log_date: string; // "YYYY-MM-DD"
  entries: DailyLogEntry[];
  notes?: string;
};

export type MacroGoals = {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
};
```

### 3.4 Macro goals — where they live

User-level setting. Two reasonable options:

**Option A (simpler, recommended for v1):** add columns to `ltc_users`:

```sql
ALTER TABLE ltc_users
  ADD COLUMN goal_calories  INT UNSIGNED NULL,
  ADD COLUMN goal_protein_g INT UNSIGNED NULL,
  ADD COLUMN goal_fat_g     INT UNSIGNED NULL,
  ADD COLUMN goal_carbs_g   INT UNSIGNED NULL;
```

**Option B (future-proof):** new `ltc_user_goals` table keyed by user, with effective-from/to dates so you can track goal changes over time. Useful if we ever ship "cut/bulk phases". Defer until needed.

→ **Going with Option A for v1.** Clean migration; we can lift to a side table later without breaking anything.

### 3.5 API surface

New routes under `src/app/api/daily-log/`:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/daily-log?date=YYYY-MM-DD` | Fetch one day's log (returns `null` if none) |
| `GET` | `/api/daily-log/range?start=YYYY-MM-DD&end=YYYY-MM-DD` | Fetch many days at once (used by the week-strip dots and history charts) |
| `PUT` | `/api/daily-log` | Upsert a single day. Body: `{ date, entries, notes }` |
| `DELETE` | `/api/daily-log?date=YYYY-MM-DD` | Wipe a day |

And for goals:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/user/goals` | Read current macro goals |
| `PUT` | `/api/user/goals` | Update goals |

DB layer (`src/lib/database/dailyLogs.ts`):

```ts
export async function getDailyLog(userId: number, date: string): Promise<DailyLog | null>;
export async function getDailyLogRange(userId: number, start: string, end: string): Promise<DailyLog[]>;
export async function upsertDailyLog(userId: number, log: DailyLog): Promise<void>;
export async function deleteDailyLog(userId: number, date: string): Promise<void>;
```

Mirrors the existing `mealPlans.ts` shape so the codebase stays coherent.

---

## 4. UI / UX design

Design priorities (in order):

1. **Speed.** Logging a known recipe should be ≤ 2 taps from the day view.
2. **Glanceability.** Day-level macros and remaining budget visible without scrolling.
3. **Continuity with the calendar.** Same chip styles, same Quick Log modal, same color tokens.
4. **Mobile first.** This is the screen people will open on their phone after a meal.

### 4.1 Page layout (desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│  📊 Daily Tracker                                  [Set Goals]   │
├──────────────────────────────────────────────────────────────────┤
│  ◀  MON   TUE   WED   THU   FRI   SAT   SUN  ▶                    │ ← week strip
│     04/27 04/28 04/29 04/30 05/01 05/02 05/03                     │   (active = THU)
│      •     •     •     ·     ·     ·     ·                        │   (• = has entries)
├──────────────────────────────────────────────────────────────────┤
│  ┌─ Today's totals ──────────────┐  ┌─ Goals ──────────────────┐  │
│  │  1,420 cal · 96P · 48F · 132C │  │ ████████░░  1420/2000   │  │
│  └───────────────────────────────┘  │ ███████░░░   96g / 150g │  │
│                                     │ ████░░░░░░   48g /  65g │  │
│  [+ Quick Add]  [Copy yesterday]    │ ██████░░░░  132g / 220g │  │
│  [Import from meal plan]            └─────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  🍳 Breakfast               420 cal · 28P · 18F · 30C            │
│    🍳 Eggs and toast  ×1.0   420 cal           [edit] [×]        │
│    + Add to breakfast                                            │
│                                                                  │
│  🥗 Lunch                   ─                                    │
│    + Add to lunch                                                │
│                                                                  │
│  🍝 Dinner                  ─                                    │
│    + Add to dinner                                               │
│                                                                  │
│  🍿 Snacks                  190 cal · 4P · 7F · 29C              │
│    Granola bar  ×1.0       190 cal             [edit] [×]        │
│    + Add a snack                                                 │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Week-strip navigator (HTML/CSS sketch)

Matches the screenshot in the brief. Active day = filled rounded card; dot under each day shows whether a log exists.

```html
<nav class="flex items-center gap-1 border border-border rounded-2xl bg-surface p-2"
     aria-label="Day navigator">
  <button class="p-2 rounded-xl hover:bg-muted" aria-label="Previous week">◀</button>

  <ol class="flex-1 grid grid-cols-7 gap-1">
    <!-- Inactive day -->
    <li>
      <button class="w-full flex flex-col items-center gap-1 py-2 px-1 rounded-xl
                     text-text-secondary hover:bg-muted transition-colors">
        <span class="text-xs font-bold tracking-wide">MON</span>
        <span class="text-sm font-semibold tabular-nums">04/27</span>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-label="Logged"></span>
      </button>
    </li>

    <!-- Active day (THU) -->
    <li>
      <button aria-current="date"
              class="w-full flex flex-col items-center gap-1 py-2 px-1 rounded-xl
                     bg-primary text-text shadow-sm">
        <span class="text-xs font-bold tracking-wide">THU</span>
        <span class="text-sm font-bold tabular-nums">04/30</span>
        <span class="w-1.5 h-1.5 rounded-full bg-text/40" aria-label="No log"></span>
      </button>
    </li>

    <!-- ... remaining days ... -->
  </ol>

  <button class="p-2 rounded-xl hover:bg-muted" aria-label="Next week">▶</button>
</nav>
```

**Behavior:**
- Left/right arrows shift the visible week by 7 days.
- Tapping a day instantly loads that day's log (cache the last ~14 days client-side so navigation feels free).
- Dot under each day comes from the range fetch (§3.5).
- Keyboard: ← → to step days, Home jumps to today.

### 4.3 Macro progress card

Two variants — let's ship the **bar** version for v1 (denser, more readable), keep rings as a follow-up.

```html
<section class="border border-border rounded-2xl p-4 bg-surface">
  <header class="flex items-baseline justify-between mb-3">
    <h3 class="font-bold text-text">Today</h3>
    <span class="text-xs text-text-secondary">580 cal remaining</span>
  </header>

  <ol class="space-y-2">
    <li>
      <div class="flex justify-between text-sm mb-1">
        <span class="font-semibold text-text">Calories</span>
        <span class="tabular-nums text-text-secondary">
          <span class="font-bold text-text">1,420</span> / 2,000
        </span>
      </div>
      <div class="h-2 rounded-full bg-muted overflow-hidden">
        <div class="h-full bg-primary rounded-full" style="width: 71%"></div>
      </div>
    </li>

    <li>
      <div class="flex justify-between text-sm mb-1">
        <span class="font-semibold text-text">Protein</span>
        <span class="tabular-nums text-text-secondary">
          <span class="font-bold text-text">96</span> / 150 g
        </span>
      </div>
      <div class="h-2 rounded-full bg-muted overflow-hidden">
        <div class="h-full bg-emerald-500 rounded-full" style="width: 64%"></div>
      </div>
    </li>

    <!-- Fat, Carbs identical -->
  </ol>
</section>
```

**Color coding:** keep palette neutral by default. When a macro is **over** goal, switch the fill to amber (`bg-amber-500`) and clamp width to 100% with a small "+" overlay. Don't punish the user with red — gentle nudges work better.

### 4.4 Meal slot section

```html
<section class="border border-border rounded-2xl bg-surface overflow-hidden">
  <header class="flex items-center justify-between px-4 py-3 border-b border-border/50">
    <div class="flex items-center gap-2">
      <span class="text-xl">🍳</span>
      <h4 class="font-bold text-text">Breakfast</h4>
    </div>
    <span class="text-sm text-text-secondary tabular-nums">
      <span class="font-bold text-text">420</span> cal · 28P · 18F · 30C
    </span>
  </header>

  <ol class="divide-y divide-border/40">
    <li class="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 group">
      <span class="text-base">🍳</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-text truncate">Eggs and toast</p>
        <p class="text-xs text-text-secondary tabular-nums">
          ×1.0 · 420 cal · 28P · 18F · 30C
        </p>
      </div>
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="p-1.5 rounded-lg hover:bg-muted" aria-label="Edit">✏️</button>
        <button class="p-1.5 rounded-lg hover:bg-red-500/10 text-text-secondary
                       hover:text-red-500" aria-label="Remove">✕</button>
      </div>
    </li>
  </ol>

  <button class="w-full text-left px-4 py-2.5 text-sm font-semibold text-text-secondary
                 hover:bg-muted/30 hover:text-text transition-colors">
    + Add to breakfast
  </button>
</section>
```

### 4.5 Quick add modal — extending `QuickLogModal`

Reuse the existing modal almost as-is. Tab order changes to lead with **the fastest path**:

| Tab order (today) | Tab order (proposed) |
|---|---|
| Manual → Recipe | **Recents** → **Recipes** → Manual |

- **Recents:** last 10–15 distinct entries the user has logged (across all days), most recent first. One tap to add. *This is the killer feature versus MyFitnessPal.*
- **Recipes:** existing recipe search.
- **Manual:** existing manual entry.

Add a **servings stepper** to the modal: `[ – ] 1.0 [ + ]`, where stepping multiplies the recipe macros automatically before the entry is created.

### 4.6 Bulk actions on the day view

Render these as a row of small chip-buttons under the totals card:

- **Copy yesterday** — clones all of yesterday's entries to today (with new ids and `logged_at = now`). Confirms via toast.
- **Import from meal plan** — if today's date has any items in the user's meal plan, pull them in as recipe entries. Surfaces the connection between the two features.
- **Clear day** — wipes the day with a confirm.

### 4.7 Mobile layout

Same components, stacked single-column. Week strip stays sticky at the top. The "Add to {slot}" buttons get larger tap targets (≥44px). The modal becomes a bottom sheet. Everything else flows naturally.

---

## 5. Wiring it into the app

- **Navigation:** add a top-level **Tracker** entry next to where the calendar lives in the dashboard. Both stay accessible; users will bounce between them.
- **Dashboard `page.tsx`:** add `showTracker` state mirroring `showCalendar`. Fetch today's log on first open and stash in state similar to `mealPlan`.
- **Default day:** `today` in the user's local timezone — we should handle TZ consistently (probably store dates as plain `YYYY-MM-DD` and compare in the user's local time; no UTC-day-boundary surprises).
- **Cross-feature link:** in the Calendar, each day cell gets a small "→ Track" link that jumps to that day in the tracker. In the Tracker, the "Import from meal plan" button is the inverse.

---

## 6. Implementation plan (step-by-step)

Tackled in roughly this order so each step ships something working.

1. **Migration & schema docs**
   - Add `ltc_daily_logs` to `src/db/schema.sql`.
   - Add the four `goal_*` columns to `ltc_users`.
   - Write `migrations/002_daily_logs.sql` for PlanetScale.
   - Update `docs/DATABASE_SCHEMA.md`.

2. **Types**
   - Add `DAILY_SLOTS`, `DailySlot`, `DailyLogEntry`, `DailyLog`, `MacroGoals` to `src/types/types.ts`.

3. **Database layer**
   - Create `src/lib/database/dailyLogs.ts` with `getDailyLog`, `getDailyLogRange`, `upsertDailyLog`, `deleteDailyLog`.
   - Add goal getters/setters to `src/lib/database/users.ts`.
   - Re-export from `src/lib/database/index.ts`.

4. **API routes**
   - `src/app/api/daily-log/route.ts` — GET (single day), PUT (upsert), DELETE.
   - `src/app/api/daily-log/range/route.ts` — GET range.
   - `src/app/api/user/goals/route.ts` — GET, PUT.

5. **Macro goals onboarding**
   - Small `GoalsModal` component. Defaults: 2000 / 150 / 65 / 220 (cal/P/F/C) — sensible starting point but make it *very* obvious these are editable.
   - Skip-able. Tracker works without goals (just hides the progress bars).

6. **Tracker page shell**
   - New component `src/components/DailyTracker.tsx`.
   - Renders week strip, totals card, four slot sections, bulk action buttons.
   - Wired to GET /api/daily-log on mount and on day switch.

7. **Reuse `QuickLogModal` with new tabs**
   - Add `RecentsList` powered by a derived "last N distinct entries" computed from the most recent 14-day range fetch. Caches in component state.
   - Add servings stepper.
   - Modal returns a `DailyLogEntry` shape (with `slot`).

8. **Persistence**
   - Debounced PUT on entries change, same pattern as `Calendar.tsx` (1s debounce, save status indicator).
   - Optimistic UI on add/remove.

9. **Bulk actions**
   - "Copy yesterday" — fetch yesterday, regenerate ids and `logged_at`, PUT to today.
   - "Import from meal plan" — pull from existing meal-plan API, map to entries, PUT.
   - "Clear day" — DELETE.

10. **Slim down `Calendar.tsx`**
    - Remove the Quick Log writing path from the calendar (still display existing quick-log entries gracefully so we don't break old data, but no new ones).
    - Keep drag-and-drop, keep macros side panel.
    - Add small "→ Track" link per day cell.
    - **Open question:** do we leave Quick Log in the calendar entirely? See §8.

11. **Dashboard wiring**
    - `showTracker` state + button next to "Show calendar".
    - Decide whether the two views can be open simultaneously (probably no — tab-style toggle is simpler).

12. **Tests**
    - Unit tests for the macro summing (move from `Calendar.tsx` to a shared helper).
    - Unit tests for the date helpers (week strip, today-in-local-tz).
    - Integration test for the API routes.

13. **Mobile pass**
    - Manual QA on a phone-width viewport.
    - Make sure the week strip is sticky and the modal becomes a bottom sheet.

---

## 7. Migration file (draft)

```sql
-- migrations/002_daily_logs.sql

USE `one-offs-v2`;

CREATE TABLE IF NOT EXISTS ltc_daily_logs (
  log_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  log_date        DATE            NOT NULL,
  entries_json    JSON            NOT NULL,
  notes           VARCHAR(500)    NULL,
  created_on      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  UNIQUE KEY ux_daily_logs_user_date (user_id, log_date),
  KEY ix_daily_logs_user (user_id),
  KEY ix_daily_logs_date (log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE ltc_users
  ADD COLUMN goal_calories  INT UNSIGNED NULL,
  ADD COLUMN goal_protein_g INT UNSIGNED NULL,
  ADD COLUMN goal_fat_g     INT UNSIGNED NULL,
  ADD COLUMN goal_carbs_g   INT UNSIGNED NULL;
```

---

## 8. Decisions (locked 2026-04-30)

| # | Question | Decision |
|---|---|---|
| 1 | Quick Log in the Calendar | **Removed.** No write path; Quick Log lives only in the Tracker. |
| 2 | Existing Quick Log data in `ltc_meal_plans` | **No migration needed** — no active users have written Quick Log data yet. Strip Quick Log fields out of the calendar serialization on next save. |
| 3 | Snacks bucket | **Single bucket.** No AM/PM split. |
| 4 | Macro goals | **Per-user single set.** Don't build our own calculator — link out to a respected one (see §4.5.1). Per-day overrides deferred. |
| 5 | Time-of-day on entries | **Optional, defaults to now.** No prompt. |
| 6 | Page location | **Dedicated route: `/dashboard/tracker`.** Add a prominent, persistent entry point from the dashboard so it's impossible to miss. |
| 7 | Recents source of truth | **Server-derived** from a 14-day range fetch. Same on web and iOS. |

### 4.5.1 Goals onboarding — link out, don't build

When the user opens Goals for the first time, show a small explainer with a button that links to a trusted macro calculator. Two well-regarded options to pick from:

- [Mayo Clinic Calorie Calculator](https://www.mayoclinic.org/healthy-lifestyle/weight-loss/in-depth/calorie-calculator/itt-20402304)
- [Precision Nutrition Macro Calculator](https://www.precisionnutrition.com/nutrition-calculator)

Open in a new tab. User comes back, types the four numbers in. We don't get into the calculation business in v1.

## 9. PlanetScale compatibility note

The schema in §3.1 and the migration in §7 use `PRIMARY KEY` and regular `KEY` (index) clauses, but **no `FOREIGN KEY` constraints** — matching the pattern in the existing `ltc_recipes` / `ltc_categories` / `ltc_meal_plans` tables.

- **Primary keys are required** by PlanetScale (Vitess uses them for sharding). Every table in the existing schema already has one.
- **Foreign key constraints** are intentionally omitted; referential integrity is enforced at the application layer (same as the rest of this codebase).

So the migration is safe to apply.

---

## 10. Sources / further reading

- [MyFitnessPal — UX Case Study (Tradecraft)](https://medium.com/tradecraft-traction/myfitnesspal-a-ux-case-study-f377ff66a504)
- [Fixing broken navigation and cluttered interface of MyFitnessPal](https://medium.com/@atharva.designs/fixing-broken-navigation-and-cluttered-interface-of-myfitnesspal-product-design-case-study-e1b1d021b44d)
- [MyFitnessPal users complain new Today tab update makes the app harder to use (Piunikaweb, 2026-04-24)](https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/)
- [A Usability Analysis of MyFitnessPal (Sean Melchionda)](http://www.sean-melchionda.com/useabilityanalysismyfitnesspal)
- [The Best Macro Tracking Apps (2026 Edition) — Fuel Nutrition](https://fuelnutrition.app/blog/best-macro-tracking-apps)
- [10 Best Nutrition Tracking Apps for 2026 — Nutrola](https://www.nutrola.app/en/blog/best-nutrition-tracking-apps-2026-ai-changing-everything)
- [Best Calorie Tracking Apps in 2026: An Honest Comparison — Kcalm](https://www.kcalm.app/blog/best-calorie-tracking-apps-comparison/)

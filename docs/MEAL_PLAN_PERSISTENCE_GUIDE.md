# Meal Plan Persistence + Quick Log — Implementation Guide

Step-by-step instructions to add meal plan auto-save and a quick-log feature to the Calendar.

---

## Phase 1: Foundation (Types, DB, API)

### Step 1: Add Types (`src/types/types.ts`)

Add the following at the bottom of the file:

```ts
// Meal Plan types

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const MEALS = ["breakfast", "lunch", "dinner"] as const;

export type DayKey = (typeof DAYS)[number];
export type MealKey = (typeof MEALS)[number];

export type QuickLogEntry = {
  id: string;
  name: string;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sugar_g: number | null;
};

export type MealSlotData = {
  recipeIds: number[];
  quickLogs: QuickLogEntry[];
};

export type MealPlanData = {
  week: Record<DayKey, Record<MealKey, MealSlotData>>;
  snacks: MealSlotData;
};
```

Then **remove** the local `DAYS`, `MEALS`, `DayKey`, `MealKey` definitions from `Calendar.tsx` (you'll import them from here instead in Step 7).

---

### Step 2: DB Migration (`migrations/002_meal_plans.sql`)

Create this file:

```sql
-- Migration: Meal Plans Persistence
-- Date: 2026-03-03
-- Description: Add table for persisting one active meal plan per user

CREATE TABLE IF NOT EXISTS ltc_meal_plans (
  user_id INT NOT NULL PRIMARY KEY,
  plan_json JSON NOT NULL COMMENT 'Full meal plan data (recipe IDs, quick logs, snacks)',
  created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_meal_plans_user FOREIGN KEY (user_id) REFERENCES ltc_users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Key design choices:
- `user_id` is the PRIMARY KEY (one plan per user, no separate plan_id needed)
- `plan_json` stores the entire `MealPlanData` structure as JSON
- `ON DELETE CASCADE` cleans up if the user is deleted

Run this migration against your PlanetScale database.

---

### Step 3: Database Module (`src/lib/database/mealPlans.ts`)

Create this file. Follow the same pattern as `recipes.ts`: import from `./connection`, use `RowDataPacket`/`ResultSetHeader`, validate params, try/catch with user-friendly errors.

```ts
import { executeQuery } from "./connection";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface MealPlanRow extends RowDataPacket {
  user_id: number;
  plan_json: string;
  modified_on: Date;
}

export async function getMealPlan(
  userId: number,
): Promise<{ planJson: string; modifiedOn: Date } | null> {
  if (!userId) throw new Error("User ID is required");

  try {
    const rows = await executeQuery<MealPlanRow[]>(
      "SELECT plan_json, modified_on FROM ltc_meal_plans WHERE user_id = ? LIMIT 1",
      [userId],
    );

    if (rows.length === 0) return null;

    return {
      planJson: rows[0].plan_json,
      modifiedOn: rows[0].modified_on,
    };
  } catch (error) {
    console.error("Error fetching meal plan:", error);
    throw new Error("Failed to load meal plan");
  }
}

export async function upsertMealPlan(
  userId: number,
  planJson: string,
): Promise<void> {
  if (!userId) throw new Error("User ID is required");
  if (!planJson) throw new Error("Plan data is required");

  try {
    await executeQuery<ResultSetHeader>(
      `INSERT INTO ltc_meal_plans (user_id, plan_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE plan_json = VALUES(plan_json), modified_on = CURRENT_TIMESTAMP`,
      [userId, planJson],
    );
  } catch (error) {
    console.error("Error saving meal plan:", error);
    throw new Error("Failed to save meal plan");
  }
}

export async function deleteMealPlan(userId: number): Promise<void> {
  if (!userId) throw new Error("User ID is required");

  try {
    await executeQuery<ResultSetHeader>(
      "DELETE FROM ltc_meal_plans WHERE user_id = ?",
      [userId],
    );
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    throw new Error("Failed to delete meal plan");
  }
}
```

Then add the re-export in `src/lib/database/index.ts`:

```ts
export * from "./mealPlans";
```

---

### Step 4: API Route (`src/app/api/meal-plan/route.ts`)

Create `src/app/api/meal-plan/route.ts`. Follow the same pattern as `get-recipes/route.ts`: `getAuthenticatedUserId()`, try/catch, `NextResponse.json`.

Three handlers:

**GET** — Load saved plan
```ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getMealPlan, upsertMealPlan, deleteMealPlan } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const result = await getMealPlan(userId);

    if (!result) {
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    const plan = JSON.parse(result.planJson);
    return NextResponse.json(
      { plan, modifiedOn: result.modifiedOn },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in meal-plan GET:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch meal plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**PUT** — Save/update plan
```ts
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = await request.json();

    if (!body.plan) {
      return NextResponse.json(
        { error: "Plan data is required" },
        { status: 400 },
      );
    }

    await upsertMealPlan(userId, JSON.stringify(body.plan));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in meal-plan PUT:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save meal plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**DELETE** — Clear plan
```ts
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    await deleteMealPlan(userId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in meal-plan DELETE:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete meal plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

## Phase 2: Calendar Persistence

### Step 5: Dashboard Changes (`src/app/dashboard/page.tsx`)

1. **Add import**: `MealPlanData` from `@/types/types`

2. **Add state**:
   ```ts
   const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null);
   ```

3. **Fetch on mount** — add to the existing `useEffect` that fetches recipes (after `fetchRecipes()` and `fetchCategories()`):
   ```ts
   const fetchMealPlan = async () => {
     try {
       const response = await fetch("/api/meal-plan");
       if (response.ok) {
         const data = await response.json();
         setMealPlan(data.plan);
       }
     } catch (error) {
       console.error("Error fetching meal plan:", error);
     }
   };

   fetchMealPlan();
   ```

4. **Update Calendar usage** (around line 532):
   ```tsx
   <Calendar
     selectedRecipes={selectedRecipes}
     allRecipes={recipes}
     initialPlan={mealPlan}
     onPlanCleared={() => setMealPlan(null)}
     onClose={() => setShowCalendar(false)}
   />
   ```

---

### Step 6: Calendar Persistence (`src/components/Calendar.tsx`)

This is the biggest change. Here's what to do:

#### 6a. Update imports and props

```ts
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Recipe,
  DAYS,
  MEALS,
  DayKey,
  MealKey,
  QuickLogEntry,
  MealSlotData,
  MealPlanData,
} from "@/types/types";
```

Remove the local `DAYS`, `MEALS`, `DayKey`, `MealKey` definitions.

Update the props type:
```ts
type CalendarProps = {
  selectedRecipes: Recipe[];
  allRecipes: Recipe[];
  onClose: () => void;
  initialPlan: MealPlanData | null;
  onPlanCleared: () => void;
};
```

Update the function signature to destructure the new props.

#### 6b. Add new state and refs

```ts
const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
const hasInitialized = useRef(false);
const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
```

#### 6c. Hydration effect

Add a `useEffect` that runs once to restore the plan from `initialPlan`:

```ts
useEffect(() => {
  if (!initialPlan || hasInitialized.current) return;
  hasInitialized.current = true;

  // Build a lookup map: recipe_id -> Recipe
  const recipeMap = new Map(allRecipes.map((r) => [r.recipe_id, r]));

  // Resolve an array of IDs to Recipe objects, dropping any missing ones
  const resolveIds = (ids: number[]): Recipe[] =>
    ids.map((id) => recipeMap.get(id)).filter(Boolean) as Recipe[];

  // Hydrate week
  const newWeek = emptyWeek();
  for (const day of DAYS) {
    for (const meal of MEALS) {
      const slot = initialPlan.week?.[day]?.[meal];
      if (slot) {
        newWeek[day][meal] = resolveIds(slot.recipeIds || []);
      }
    }
  }
  setWeek(newWeek);

  // Hydrate snacks
  if (initialPlan.snacks) {
    setSnacks(resolveIds(initialPlan.snacks.recipeIds || []));
  }
}, [initialPlan, allRecipes]);
```

Key: `resolveIds` drops any IDs that don't exist in `allRecipes` (handles deleted recipes gracefully).

#### 6d. Serialization helper

```ts
const serializePlan = useCallback((): MealPlanData => {
  const weekData = {} as Record<DayKey, Record<MealKey, MealSlotData>>;
  for (const day of DAYS) {
    weekData[day] = {} as Record<MealKey, MealSlotData>;
    for (const meal of MEALS) {
      weekData[day][meal] = {
        recipeIds: week[day][meal].map((r) => r.recipe_id),
        quickLogs: [],  // Will be populated in Phase 3
      };
    }
  }
  return {
    week: weekData,
    snacks: {
      recipeIds: snacks.map((r) => r.recipe_id),
      quickLogs: [],  // Will be populated in Phase 3
    },
  };
}, [week, snacks]);
```

#### 6e. Auto-save effect

```ts
const isPlanEmpty = useCallback((): boolean => {
  const hasWeekContent = DAYS.some((day) =>
    MEALS.some((meal) => week[day][meal].length > 0),
  );
  return !hasWeekContent && snacks.length === 0;
}, [week, snacks]);

useEffect(() => {
  if (!hasInitialized.current) return;
  if (saveTimeout.current) clearTimeout(saveTimeout.current);

  saveTimeout.current = setTimeout(async () => {
    if (isPlanEmpty()) return;

    setSaveStatus("saving");
    try {
      const res = await fetch("/api/meal-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: serializePlan() }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  }, 1000);

  return () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
  };
}, [week, snacks, serializePlan, isPlanEmpty]);

// Mark as initialized if no plan to hydrate
useEffect(() => {
  if (!initialPlan && !hasInitialized.current) {
    hasInitialized.current = true;
  }
}, [initialPlan]);
```

The `hasInitialized` ref prevents the auto-save from firing during hydration.

#### 6f. Update Clear All

```ts
const handleClearAll = async () => {
  setSnacks([]);
  setWeek(emptyWeek());
  try {
    await fetch("/api/meal-plan", { method: "DELETE" });
  } catch {
    // silent
  }
  onPlanCleared();
};
```

#### 6g. Save status indicator

In the header JSX, next to the "Meal Plan" title, add:

```tsx
<div className="flex items-center gap-3">
  <h2 className="text-3xl text-text font-bold">Meal Plan</h2>
  {saveStatus !== "idle" && (
    <span
      className={`text-xs font-medium no-print ${
        saveStatus === "saving"
          ? "text-text-secondary"
          : saveStatus === "saved"
            ? "text-green-600"
            : "text-red-500"
      }`}
    >
      {saveStatus === "saving"
        ? "Saving..."
        : saveStatus === "saved"
          ? "Saved"
          : "Save failed"}
    </span>
  )}
</div>
```

---

## Phase 3: Quick Log

### Step 7: QuickLogModal (`src/components/QuickLogModal.tsx`)

Create this component. It follows the same modal pattern as `RecipeDetailModal`:
- Backdrop with `fixed inset-0 bg-black/50 z-40`
- `onClick` backdrop closes, `stopPropagation` on inner div
- Escape key closes
- `document.body.style.overflow = "hidden"` while open

```tsx
"use client";
import { useState, useEffect } from "react";
import { QuickLogEntry } from "@/types/types";

type QuickLogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entry: QuickLogEntry) => void;
  slotLabel: string;  // e.g. "Monday Breakfast"
};
```

**Form fields:**
- Meal Name (required text input, `autoFocus`)
- 5 optional number inputs: Calories, Protein (g), Fat (g), Carbs (g), Sugar (g)
- Use a 2-column grid for the macro fields
- Show helper text: "Macros are optional — blank fields are ignored in totals."

**On submit:**
```ts
const parseNum = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

const entry: QuickLogEntry = {
  id: crypto.randomUUID(),
  name: name.trim(),
  calories: parseNum(calories),
  protein_g: parseNum(protein),
  fat_g: parseNum(fat),
  carbs_g: parseNum(carbs),
  sugar_g: parseNum(sugar),
};
```

Reset form fields after submit.

**Buttons:** Cancel (bg-muted) and Add (bg-primary), same button styles as the rest of the app.

---

### Step 8: Calendar Quick Log Integration (`src/components/Calendar.tsx`)

#### 8a. New state

```ts
import QuickLogModal from "./QuickLogModal";

// Parallel state for quick logs
type QuickLogDayPlan = Record<MealKey, QuickLogEntry[]>;
type WeekQuickLogs = Record<DayKey, QuickLogDayPlan>;

const emptyQuickLogDay = (): QuickLogDayPlan => ({
  breakfast: [], lunch: [], dinner: [],
});
const emptyWeekQuickLogs = (): WeekQuickLogs =>
  Object.fromEntries(DAYS.map((d) => [d, emptyQuickLogDay()])) as WeekQuickLogs;
```

Add to state:
```ts
const [snackQuickLogs, setSnackQuickLogs] = useState<QuickLogEntry[]>([]);
const [weekQuickLogs, setWeekQuickLogs] = useState<WeekQuickLogs>(emptyWeekQuickLogs());
const [quickLogTarget, setQuickLogTarget] = useState<{
  day?: DayKey;
  meal?: MealKey;
  isSnack?: boolean;
} | null>(null);
```

#### 8b. Updated macro helpers

Replace `sumMacros` with two functions:

```ts
const sumRecipeMacros = (recipes: Recipe[]): Macros =>
  recipes.reduce(
    (acc, r) => ({
      calories: acc.calories + Math.round(r.per_serving_calories),
      protein: acc.protein + Math.round(r.per_serving_protein_g),
      fat: acc.fat + Math.round(r.per_serving_fat_g),
      carbs: acc.carbs + Math.round(r.per_serving_carbs_g),
    }),
    { ...ZERO_MACROS },
  );

const sumQuickLogMacros = (logs: QuickLogEntry[]): Macros =>
  logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories ?? 0),
      protein: acc.protein + (log.protein_g ?? 0),
      fat: acc.fat + (log.fat_g ?? 0),
      carbs: acc.carbs + (log.carbs_g ?? 0),
    }),
    { ...ZERO_MACROS },
  );

const slotMacros = (recipes: Recipe[], quickLogs: QuickLogEntry[]): Macros => {
  const r = sumRecipeMacros(recipes);
  const q = sumQuickLogMacros(quickLogs);
  return addMacros(r, q);
};
```

Key: `null` macro fields use `?? 0` — they contribute nothing to the sum but don't break the math.

#### 8c. Remove handlers

```ts
const removeSnackQuickLog = (index: number) => {
  setSnackQuickLogs((prev) => prev.filter((_, i) => i !== index));
};

const removeMealQuickLog = (day: DayKey, meal: MealKey, index: number) => {
  setWeekQuickLogs((prev) => ({
    ...prev,
    [day]: {
      ...prev[day],
      [meal]: prev[day][meal].filter((_, i) => i !== index),
    },
  }));
};
```

#### 8d. Quick log submit handler

```ts
const handleQuickLogSubmit = (entry: QuickLogEntry) => {
  if (!quickLogTarget) return;

  if (quickLogTarget.isSnack) {
    setSnackQuickLogs((prev) => [...prev, entry]);
  } else if (quickLogTarget.day && quickLogTarget.meal) {
    setWeekQuickLogs((prev) => ({
      ...prev,
      [quickLogTarget.day!]: {
        ...prev[quickLogTarget.day!],
        [quickLogTarget.meal!]: [
          ...prev[quickLogTarget.day!][quickLogTarget.meal!],
          entry,
        ],
      },
    }));
  }
};
```

#### 8e. Quick log chip renderer

```tsx
const renderQuickLogChip = (
  entry: QuickLogEntry,
  key: string,
  onRemove: () => void,
) => (
  <div
    key={key}
    className="inline-flex items-center gap-1 border-2 border-dashed border-text-secondary rounded-xl px-3 py-1 text-sm font-bold text-text bg-muted/30"
  >
    <span>
      {entry.name}
      {entry.calories != null && (
        <span className="font-normal text-text-secondary ml-1">
          {entry.calories} cal
        </span>
      )}
    </span>
    <button
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      className="ml-1 text-text-secondary hover:text-red-500 text-xs font-bold no-print"
    >
      ✕
    </button>
  </div>
);
```

Note the `border-dashed` to distinguish quick logs from recipe chips.

#### 8f. Update `renderDropZone`

Add new parameters and render quick-log chips + the "+ Quick Log" button:

```tsx
const renderDropZone = (
  targetId: string,
  items: Recipe[],
  quickLogs: QuickLogEntry[],          // NEW
  onDrop: (e: React.DragEvent) => void,
  onRemoveItem: (index: number) => void,
  onRemoveQuickLog: (index: number) => void,  // NEW
  onQuickLogClick: () => void,                  // NEW
  extraClass: string = "",
) => (
  <div /* ...same wrapper div... */ >
    <div className="flex flex-wrap gap-1.5">
      {items.map((recipe, idx) =>
        renderChip(recipe, `${targetId}-${recipe.recipe_id}-${idx}`, {
          onRemove: () => onRemoveItem(idx),
        }),
      )}
      {quickLogs.map((entry, idx) =>
        renderQuickLogChip(entry, `${targetId}-ql-${entry.id}`, () =>
          onRemoveQuickLog(idx),
        ),
      )}
    </div>
    {items.length === 0 && quickLogs.length === 0 && (
      <p className="text-text-secondary text-xs text-center py-2 no-print">
        Drop recipes here
      </p>
    )}
    <button
      onClick={onQuickLogClick}
      className="mt-1 text-xs text-text-secondary hover:text-text font-semibold no-print"
    >
      + Quick Log
    </button>
  </div>
);
```

#### 8g. Update all `renderDropZone` call sites

**Snacks:**
```tsx
{renderDropZone(
  "snacks",
  snacks,
  snackQuickLogs,
  handleDropSnacks,
  removeSnack,
  removeSnackQuickLog,
  () => setQuickLogTarget({ isSnack: true }),
)}
```

**Each meal cell:**
```tsx
{renderDropZone(
  `${day}-${meal}`,
  week[day][meal],
  weekQuickLogs[day][meal],
  (e) => handleDropMeal(e, day, meal),
  (idx) => removeMealItem(day, meal, idx),
  (idx) => removeMealQuickLog(day, meal, idx),
  () => setQuickLogTarget({ day, meal }),
  "min-h-[5rem]",
)}
```

#### 8h. Update macro calculations

**Snack macros:** Change `sumMacros(snacks)` to `slotMacros(snacks, snackQuickLogs)`

**Day macros:**
```ts
const dayMacros = MEALS.reduce(
  (acc, meal) =>
    addMacros(acc, slotMacros(week[day][meal], weekQuickLogs[day][meal])),
  { ...ZERO_MACROS },
);
```

**Weekly average:**
```ts
const daysWithFood = DAYS.filter((day) =>
  MEALS.some(
    (meal) => week[day][meal].length > 0 || weekQuickLogs[day][meal].length > 0,
  ),
);
const totalMacros = DAYS.reduce(
  (acc, day) =>
    MEALS.reduce(
      (inner, meal) =>
        addMacros(inner, slotMacros(week[day][meal], weekQuickLogs[day][meal])),
      acc,
    ),
  { ...ZERO_MACROS },
);
```

#### 8i. Update hydration to include quick logs

In the hydration `useEffect`, also restore quick logs:

```ts
const newWeekQL = emptyWeekQuickLogs();
for (const day of DAYS) {
  for (const meal of MEALS) {
    const slot = initialPlan.week?.[day]?.[meal];
    if (slot) {
      newWeek[day][meal] = resolveIds(slot.recipeIds || []);
      newWeekQL[day][meal] = slot.quickLogs || [];
    }
  }
}
setWeekQuickLogs(newWeekQL);

if (initialPlan.snacks) {
  setSnackQuickLogs(initialPlan.snacks.quickLogs || []);
}
```

#### 8j. Update serialization to include quick logs

```ts
weekData[day][meal] = {
  recipeIds: week[day][meal].map((r) => r.recipe_id),
  quickLogs: weekQuickLogs[day][meal],
};

// snacks:
snacks: {
  recipeIds: snacks.map((r) => r.recipe_id),
  quickLogs: snackQuickLogs,
},
```

#### 8k. Update auto-save dependencies

Add `weekQuickLogs` and `snackQuickLogs` to the auto-save `useEffect` dependency array and the `isPlanEmpty` / `serializePlan` callbacks.

#### 8l. Update Clear All

```ts
const handleClearAll = async () => {
  setSnacks([]);
  setWeek(emptyWeek());
  setSnackQuickLogs([]);
  setWeekQuickLogs(emptyWeekQuickLogs());
  try {
    await fetch("/api/meal-plan", { method: "DELETE" });
  } catch { /* silent */ }
  onPlanCleared();
};
```

#### 8m. Add modal to JSX

Right after the `<style>` block and before `<section>`:

```tsx
<QuickLogModal
  isOpen={quickLogTarget !== null}
  onClose={() => setQuickLogTarget(null)}
  onSubmit={handleQuickLogSubmit}
  slotLabel={getQuickLogLabel()}
/>
```

With the helper:
```ts
const getQuickLogLabel = (): string => {
  if (!quickLogTarget) return "";
  if (quickLogTarget.isSnack) return "Snacks";
  return `${capitalize(quickLogTarget.day || "")} ${capitalize(quickLogTarget.meal || "")}`;
};
```

---

## Verification Checklist

1. Create a meal plan by dragging recipes into calendar slots, wait 1s, refresh page, confirm state restores
2. Click "Clear All", refresh, confirm plan is gone
3. Open Quick Log modal on a slot, add entry with partial macros, verify it appears as a dashed chip
4. Verify day/week macro totals include quick-log values and ignore null fields
5. Add quick logs, refresh, confirm they persist
6. Delete a recipe that's in the calendar, refresh, confirm the slot gracefully drops the missing recipe
7. Print view should hide "+ Quick Log" buttons and save indicator (they have `no-print` class)

# Consolidate Category Information

## Problem

Categories are hardcoded in 3 separate frontend locations, but the DB (`ltc_categories`) already has the structure to be the single source of truth. This creates drift risk — adding or changing a category requires updating multiple files. The dashboard category filter is also broken (`fetchCategoies` at `dashboard/page.tsx:78` is an empty function).

### Current hardcoded sources

1. **`src/lib/categoryColors.ts`** — `CATEGORY_COLORS` record mapping 21 category names to hex colors. Used by `RecipeCard`, `ExploreRecipeCard`, `SelectedRecipeCard` for card glow styling.
2. **`src/app/explore_recipes/page.tsx:19-42`** — `CATEGORY_OPTIONS` array (21 value/label objects) for the explore page filter dropdown.
3. **`src/app/create_recipe/page.tsx:71-93`** — `categories` array (21 strings) for the create recipe dropdown.
4. **`src/app/dashboard/page.tsx:78-80`** — Empty `fetchCategoies` function. Category dropdown is broken/empty.

### DB structure (already exists)

- `ltc_categories`: `category_id`, `user_id`, `category_name`, `color_hex` (per-user, unique on user_id + category_name)
- `ltc_recipes` joins via `category_id`
- `insertRecipe` auto-creates categories but always uses hardcoded `"#6366f1"` instead of proper colors

---

## Implementation Steps

### Step 1: Add `DEFAULT_CATEGORY_LIST` export to `src/lib/categoryColors.ts`

Add a structured array derived from the existing `CATEGORY_COLORS` map. Keep `CATEGORY_COLORS` and `getCategoryColor()` as-is (still used by card components).

```ts
export const DEFAULT_CATEGORY_LIST: { name: string; color_hex: string }[] =
  Object.entries(CATEGORY_COLORS).map(([name, color_hex]) => ({
    name,
    color_hex,
  }));
```

### Step 2: Create `src/lib/database/categories.ts`

New database module following existing patterns (`recipes.ts`, `engagement.ts`).

```ts
import { executeQuery } from "./connection";
import { RowDataPacket } from "mysql2";
import { Category } from "@/types/types";

interface CategoryRow extends RowDataPacket {
  category_id: number;
  user_id: number;
  category_name: string;
  color_hex: string;
}

export async function getUserCategories(userId: number): Promise<Category[]> {
  const rows = await executeQuery<CategoryRow[]>(
    `SELECT category_id, user_id, category_name, color_hex
     FROM ltc_categories
     WHERE user_id = ?
     ORDER BY category_name ASC`,
    [userId],
  );
  return rows.map((row) => ({
    category_id: row.category_id,
    user_id: row.user_id,
    category_name: row.category_name,
    color_hex: row.color_hex,
  }));
}
```

### Step 3: Add barrel export in `src/lib/database/index.ts`

```ts
export * from "./categories";
```

### Step 4: Implement `src/app/api/categories/route.ts`

File already exists but is empty. Two modes via query param:

- `GET /api/categories` — returns the authenticated user's categories from DB
- `GET /api/categories?scope=explore` — returns the default 21 categories (for explore page)

```ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getUserCategories } from "@/lib/database/categories";
import { DEFAULT_CATEGORY_LIST } from "@/lib/categoryColors";

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");

    if (scope === "explore") {
      const categories = DEFAULT_CATEGORY_LIST.map((c) => ({
        category_name: c.name,
        color_hex: c.color_hex,
      }));
      return NextResponse.json({ categories }, { status: 200 });
    }

    const userId = await getAuthenticatedUserId();
    const categories = await getUserCategories(userId);
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Error in categories API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

### Step 5: Fix color assignment in `src/lib/database/recipes.ts`

Import `CATEGORY_COLORS` and replace hardcoded `"#6366f1"` in both `insertRecipe` (line 451) and `updateRecipe` (line 552):

```ts
// Before
[recipe.user_id, categoryName, "#6366f1"]

// After
[recipe.user_id, categoryName, CATEGORY_COLORS[categoryName.toLowerCase()] || "#6366f1"]
```

### Step 6: Fix `src/app/dashboard/page.tsx`

Implement the empty `fetchCategoies` function to call `GET /api/categories`. Populate the category dropdown from the API response. Add an "All Categories" default option.

```ts
const fetchCategories = async () => {
  try {
    const response = await fetch("/api/categories");
    if (response.ok) {
      const data = await response.json();
      setCategories(data.categories);
    }
  } catch (err) {
    console.error("Error fetching categories:", err);
  }
};
```

Call alongside `fetchRecipes()` in the existing `useEffect`. Update `<select>` to map over `Category` objects with `cat.category_name`.

### Step 7: Update `src/app/create_recipe/page.tsx`

Remove the hardcoded 21-item `categories` array (lines 71-93). Initialize state with defaults so dropdown is never empty, then fetch to add any custom user categories:

```ts
import { DEFAULT_CATEGORY_LIST } from "@/lib/categoryColors";

const [categories, setCategories] = useState<string[]>(
  DEFAULT_CATEGORY_LIST.map((c) => c.name)
);

useEffect(() => {
  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        const userNames: string[] = data.categories.map(
          (c: { category_name: string }) => c.category_name
        );
        const defaultNames = new Set(DEFAULT_CATEGORY_LIST.map((c) => c.name));
        const extras = userNames.filter((n) => !defaultNames.has(n));
        if (extras.length > 0) {
          setCategories((prev) => [...prev, ...extras]);
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };
  fetchCategories();
}, []);
```

### Step 8: Update `src/app/explore_recipes/page.tsx`

Replace hardcoded `CATEGORY_OPTIONS` (lines 19-42) with derivation from `DEFAULT_CATEGORY_LIST`:

```ts
import { DEFAULT_CATEGORY_LIST } from "@/lib/categoryColors";

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  ...DEFAULT_CATEGORY_LIST.map((c) => ({
    value: c.name,
    label: c.name.charAt(0).toUpperCase() + c.name.slice(1),
  })),
];
```

No API fetch needed — explore page always uses the default set.

---

## Files Changed

| File | Type | Description |
|------|------|-------------|
| `src/lib/categoryColors.ts` | Modify | Add `DEFAULT_CATEGORY_LIST` export |
| `src/lib/database/categories.ts` | **New** | `getUserCategories()` query |
| `src/lib/database/index.ts` | Modify | Add barrel export |
| `src/app/api/categories/route.ts` | Modify (empty) | Implement GET handler |
| `src/lib/database/recipes.ts` | Modify | Fix hardcoded color in insert/update |
| `src/app/dashboard/page.tsx` | Modify | Implement fetchCategories, fix dropdown |
| `src/app/create_recipe/page.tsx` | Modify | Replace hardcoded array with fetch + defaults |
| `src/app/explore_recipes/page.tsx` | Modify | Derive CATEGORY_OPTIONS from DEFAULT_CATEGORY_LIST |

## Verification

- [ ] `npm run build` compiles without errors
- [ ] Dashboard category dropdown populates with user's categories
- [ ] Create recipe dropdown shows all defaults + any custom categories
- [ ] Explore page filter dropdown unchanged in behavior
- [ ] Creating a recipe with a known category (e.g. "breakfast") stores correct `color_hex` in DB instead of `"#6366f1"`

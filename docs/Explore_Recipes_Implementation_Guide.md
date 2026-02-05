# Explore Recipes Implementation Guide

A step-by-step guide for building the Explore Recipes feature. This feature allows users to browse public recipes created by the community, filter/search them, and add copies to their own collection.

**Difficulty Level:** Intermediate
**Estimated Steps:** 8
**Prerequisites:** Familiarity with React, Next.js API routes, MySQL

---

## Table of Contents

1. [Database Changes](#step-1-database-changes)
2. [Update Types](#step-2-update-types)
3. [Create Database Helper Functions](#step-3-create-database-helper-functions)
4. [Create the Explore Recipes API](#step-4-create-the-explore-recipes-api)
5. [Create the Add Recipe API](#step-5-create-the-add-recipe-api)
6. [Update Create Recipe API](#step-6-update-create-recipe-api)
7. [Build the Explore Page UI](#step-7-build-the-explore-page-ui)
8. [Testing Checklist](#step-8-testing-checklist)

---

## Overview

### What We're Building

- **Explore Page** (`/explore_recipes`) - Browse community recipes with search, filters, and infinite scroll
- **Recipe Cards** - Show recipe name, ingredients preview, macros, creator profile, and "Add" button
- **Add to Collection** - Copy a community recipe to user's own collection
- **Tracking** - Track clicks and adds for popularity sorting

### Key Design Decisions

| Decision                       | Choice                                       |
| ------------------------------ | -------------------------------------------- |
| When user adds a recipe        | Creates a full editable copy                 |
| Already added recipes          | Hidden from explore results                  |
| Calorie filter                 | Preset buckets (Under 300, 300-500, 500+)    |
| Batch size for infinite scroll | 18 recipes per load                          |
| Sorting                        | By click count, then created date descending |

---

## Step 1: Database Changes

### 1a. Add `is_created_by_user` column to recipes table

This flag distinguishes between:

- `1` = User created this recipe (via Create Recipe flow)
- `0` = User added this from Explore (copied from another user)

**Run this SQL:**

```sql
ALTER TABLE ltc_recipes
ADD COLUMN is_created_by_user TINYINT(1) NOT NULL DEFAULT 1
AFTER is_public;
```

**Why DEFAULT 1?** All existing recipes were created by their users, so they should default to `1`. Only copied recipes will have `0`.

### 1b. Create the recipe engagement tracking table

This table tracks clicks and adds for each recipe, used for popularity sorting.

```sql
  CREATE TABLE IF NOT EXISTS ltc_recipe_engagement (
    recipe_id       BIGINT UNSIGNED NOT NULL,
    click_count     INT UNSIGNED NOT NULL DEFAULT 0,
    add_count       INT UNSIGNED NOT NULL DEFAULT 0,
    last_clicked_on DATETIME NULL,
    last_added_on   DATETIME NULL,
    PRIMARY KEY (recipe_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 1c. Add index for explore query performance

```sql
CREATE INDEX ix_recipes_explore
ON ltc_recipes (is_public, is_created_by_user, created_on);
```

### Verification

After running the SQL, verify with:

```sql
DESCRIBE ltc_recipes;
-- Should see is_created_by_user column

SHOW TABLES LIKE 'ltc_recipe_engagement';
-- Should return the new table
```

---

## Step 2: Update Types

### 2a. Update the Recipe type

**File:** `src/types/types.ts`

Add the new field to the Recipe type:

```typescript
export type Recipe = {
  recipe_id: number;
  user_id: number;
  user_name: string;
  is_public: 0 | 1;
  is_created_by_user: 0 | 1; // ADD THIS LINE
  category: string;
  name: string;
  // ... rest of existing fields
};
```

### 2b. Create ExploreRecipe type

This extends Recipe with engagement data and creator info for the explore page.

**File:** `src/types/types.ts`

Add at the bottom:

```typescript
export type ExploreRecipe = Recipe & {
  creator_name: string;
  creator_profile_pic: string | null;
  click_count: number;
  add_count: number;
};

export type ExploreFilters = {
  search?: string;
  category?: string;
  calorieRange?: "under300" | "300to500" | "over500";
  limit: number;
  offset: number;
};
```

---

## Step 3: Create Database Helper Functions

### 3a. Get Explore Recipes

**File:** `src/lib/database/getExploreRecipes.ts` (create new file)

```typescript
import { executeQuery } from "./connection";
import { RowDataPacket } from "mysql2";
import { ExploreRecipe, ExploreFilters } from "@/types/types";

interface ExploreRecipeRow extends RowDataPacket {
  recipe_id: number;
  user_id: number;
  user_name: string;
  is_public: number;
  is_created_by_user: number;
  category_name: string;
  name: string;
  servings: number;
  ingredients_json: string;
  instructions_json: string;
  per_serving_calories: number;
  per_serving_protein_g: number;
  per_serving_fat_g: number;
  per_serving_carbs_g: number;
  per_serving_sugar_g: number;
  emoji: string;
  tags_json: string;
  active_time_min: number;
  total_time_min: number;
  created_on: Date;
  creator_name: string;
  creator_profile_pic: string | null;
  click_count: number;
  add_count: number;
}

export async function getExploreRecipes(
  currentUserId: number,
  filters: ExploreFilters,
): Promise<{ recipes: ExploreRecipe[]; hasMore: boolean }> {
  const { search, category, calorieRange, limit, offset } = filters;

  // Build WHERE conditions
  const conditions: string[] = [
    "r.is_public = 1",
    "r.is_created_by_user = 1", // Only show originally created recipes
    "r.user_id != ?", // Exclude current user's recipes
  ];
  const params: (string | number)[] = [currentUserId];

  // Exclude recipes user has already added
  conditions.push(`
    r.recipe_id NOT IN (
      SELECT recipe_id FROM ltc_recipes
      WHERE user_id = ? AND is_created_by_user = 0
    )
  `);
  params.push(currentUserId);

  // Search filter
  if (search) {
    conditions.push("(r.name LIKE ? OR r.ingredients_json LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  // Category filter
  if (category) {
    conditions.push("c.category_name = ?");
    params.push(category);
  }

  // Calorie range filter
  if (calorieRange === "under300") {
    conditions.push("r.per_serving_calories < 300");
  } else if (calorieRange === "300to500") {
    conditions.push(
      "r.per_serving_calories >= 300 AND r.per_serving_calories <= 500",
    );
  } else if (calorieRange === "over500") {
    conditions.push("r.per_serving_calories > 500");
  }

  const whereClause = conditions.join(" AND ");

  const query = `
    SELECT
      r.recipe_id,
      r.user_id,
      u.user_name,
      r.is_public,
      r.is_created_by_user,
      COALESCE(c.category_name, 'Uncategorized') as category_name,
      r.name,
      r.servings,
      r.ingredients_json,
      r.instructions_json,
      r.per_serving_calories,
      r.per_serving_protein_g,
      r.per_serving_fat_g,
      r.per_serving_carbs_g,
      r.per_serving_sugar_g,
      r.emoji,
      r.tags_json,
      r.active_time_min,
      r.total_time_min,
      r.created_on,
      u.user_name as creator_name,
      u.profile_pic_url as creator_profile_pic,
      COALESCE(e.click_count, 0) as click_count,
      COALESCE(e.add_count, 0) as add_count
    FROM ltc_recipes r
    LEFT JOIN ltc_users u ON r.user_id = u.user_id
    LEFT JOIN ltc_categories c ON r.category_id = c.category_id
    LEFT JOIN ltc_recipe_engagement e ON r.recipe_id = e.recipe_id
    WHERE ${whereClause}
    ORDER BY COALESCE(e.click_count, 0) DESC, r.created_on DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit + 1, offset); // Fetch one extra to check if there's more

  const rows = await executeQuery<ExploreRecipeRow[]>(query, params);

  const hasMore = rows.length > limit;
  const recipes = rows.slice(0, limit).map((row) => ({
    recipe_id: row.recipe_id,
    user_id: row.user_id,
    user_name: row.user_name,
    is_public: row.is_public as 0 | 1,
    is_created_by_user: row.is_created_by_user as 0 | 1,
    category: row.category_name,
    name: row.name,
    servings: row.servings,
    ingredients_json: JSON.parse(row.ingredients_json || "[]"),
    instructions_json: JSON.parse(row.instructions_json || "[]"),
    per_serving_calories: row.per_serving_calories,
    per_serving_protein_g: row.per_serving_protein_g,
    per_serving_fat_g: row.per_serving_fat_g,
    per_serving_carbs_g: row.per_serving_carbs_g,
    per_serving_sugar_g: row.per_serving_sugar_g,
    emoji: row.emoji || "🍽️",
    tags: JSON.parse(row.tags_json || "[]"),
    time: {
      active_min: row.active_time_min || 0,
      total_time: row.total_time_min || 0,
    },
    creator_name: row.creator_name,
    creator_profile_pic: row.creator_profile_pic,
    click_count: row.click_count,
    add_count: row.add_count,
  }));

  return { recipes, hasMore };
}
```

### 3b. Increment Click Count

**File:** `src/lib/database/incrementRecipeClick.ts` (create new file)

```typescript
import { executeQuery } from "./connection";

export async function incrementRecipeClick(recipeId: number): Promise<void> {
  await executeQuery(
    `
    INSERT INTO ltc_recipe_engagement (recipe_id, click_count, last_clicked_on)
    VALUES (?, 1, NOW())
    ON DUPLICATE KEY UPDATE
      click_count = click_count + 1,
      last_clicked_on = NOW()
    `,
    [recipeId],
  );
}
```

### 3c. Copy Recipe to User's Collection

**File:** `src/lib/database/copyRecipeToUser.ts` (create new file)

```typescript
import { withTransaction } from "./connection";
import { ResultSetHeader } from "mysql2";

export async function copyRecipeToUser(
  recipeId: number,
  newUserId: number,
): Promise<{ newRecipeId: number }> {
  return await withTransaction(async (connection) => {
    // 1. Copy the recipe with is_created_by_user = 0
    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
      INSERT INTO ltc_recipes (
        user_id, category_id, name, servings, ingredients_json, instructions_json,
        is_public, is_created_by_user, per_serving_calories, per_serving_protein_g,
        per_serving_fat_g, per_serving_carbs_g, per_serving_sugar_g,
        emoji, tags_json, active_time_min, total_time_min
      )
      SELECT
        ?, category_id, name, servings, ingredients_json, instructions_json,
        0, 0, per_serving_calories, per_serving_protein_g,
        per_serving_fat_g, per_serving_carbs_g, per_serving_sugar_g,
        emoji, tags_json, active_time_min, total_time_min
      FROM ltc_recipes
      WHERE recipe_id = ?
      `,
      [newUserId, recipeId],
    );

    const newRecipeId = insertResult.insertId;

    // 2. Increment the add_count on the original recipe
    await connection.execute(
      `
      INSERT INTO ltc_recipe_engagement (recipe_id, add_count, last_added_on)
      VALUES (?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        add_count = add_count + 1,
        last_added_on = NOW()
      `,
      [recipeId],
    );

    return { newRecipeId };
  });
}
```

---

## Step 4: Create the Explore Recipes API

**File:** `src/app/api/explore-recipes/route.ts` (create new file)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/database/getOrCreateUser";
import { getExploreRecipes } from "@/lib/database/getExploreRecipes";
import { ExploreFilters } from "@/types/types";

export async function GET(request: NextRequest) {
  try {
    const userId = await getOrCreateUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const filters: ExploreFilters = {
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || undefined,
      calorieRange: searchParams.get(
        "calorieRange",
      ) as ExploreFilters["calorieRange"],
      limit: parseInt(searchParams.get("limit") || "18", 10),
      offset: parseInt(searchParams.get("offset") || "0", 10),
    };

    const { recipes, hasMore } = await getExploreRecipes(userId, filters);

    return NextResponse.json({ recipes, hasMore });
  } catch (error) {
    console.error("Error fetching explore recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}
```

---

## Step 5: Create the Add Recipe API

**File:** `src/app/api/recipes/[id]/add/route.ts` (create new file)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/database/getOrCreateUser";
import { copyRecipeToUser } from "@/lib/database/copyRecipeToUser";
import { getUserSubscription } from "@/lib/database/getUserSubscription";
import { FREE_TIER_RECIPE_LIMIT } from "@/types/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getOrCreateUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    // Check recipe limit for free users
    const subscription = await getUserSubscription(userId);
    if (!subscription.canCreateRecipe) {
      return NextResponse.json(
        {
          error: "Recipe limit reached. Upgrade to Pro for unlimited recipes.",
        },
        { status: 403 },
      );
    }

    const { newRecipeId } = await copyRecipeToUser(recipeId, userId);

    return NextResponse.json({
      success: true,
      newRecipeId,
      message: "Recipe added to your collection!",
    });
  } catch (error) {
    console.error("Error adding recipe:", error);
    return NextResponse.json(
      { error: "Failed to add recipe" },
      { status: 500 },
    );
  }
}
```

---

## Step 6: Update Create Recipe API

When a user creates a recipe, set `is_created_by_user = 1`.

**File:** `src/lib/database/insertRecipe.ts`

Find the INSERT statement and ensure `is_created_by_user` is included:

```typescript
// In the INSERT column list, add:
is_created_by_user,

// In the VALUES, add:
1,  // Always 1 for user-created recipes
```

**Note:** Check if the column already exists in the INSERT. If not, you'll need to add it to both the column list and values list.

---

## Step 7: Build the Explore Page UI

### 7a. Create the Explore Recipe Card Component

**File:** `src/components/ExploreRecipeCard.tsx` (create new file)

```typescript
"use client";

import { ExploreRecipe } from "@/types/types";
import { useState } from "react";
import toast from "react-hot-toast";

interface ExploreRecipeCardProps {
  recipe: ExploreRecipe;
  onAdd: (recipeId: number) => Promise<void>;
  onClick: (recipeId: number) => void;
}

export default function ExploreRecipeCard({
  recipe,
  onAdd,
  onClick,
}: ExploreRecipeCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger card click
    setIsAdding(true);
    try {
      await onAdd(recipe.recipe_id);
      toast.success("Recipe added to your collection!");
    } catch (error) {
      toast.error("Failed to add recipe");
    } finally {
      setIsAdding(false);
    }
  };

  // Show first 3 ingredients as preview
  const ingredientPreview = recipe.ingredients_json
    .slice(0, 3)
    .map((ing, i) => `${i + 1}. ${ing.quantity} ${ing.unit} ${ing.name}`)
    .join("\n");

  return (
    <div
      onClick={() => onClick(recipe.recipe_id)}
      className="border-2 border-border rounded-2xl p-4 bg-surface shadow-md hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer flex flex-col"
    >
      {/* Header with name and creator */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-text">
          {recipe.emoji} {recipe.name}
        </h3>
        <div className="flex items-center gap-2">
          {recipe.creator_profile_pic ? (
            <img
              src={recipe.creator_profile_pic}
              alt={recipe.creator_name}
              className="w-8 h-8 rounded-full border-2 border-secondary"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary/30 border-2 border-secondary flex items-center justify-center text-xs font-bold text-text">
              {recipe.creator_name?.charAt(0) || "?"}
            </div>
          )}
        </div>
      </div>

      {/* Ingredients preview */}
      <div className="mb-3">
        <p className="text-sm font-semibold text-text mb-1">Ingredients</p>
        <p className="text-xs text-text-secondary whitespace-pre-line">
          {ingredientPreview}
          {recipe.ingredients_json.length > 3 && (
            <span className="text-text-secondary">
              {"\n"}+{recipe.ingredients_json.length - 3} more...
            </span>
          )}
        </p>
      </div>

      {/* Macros */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-text mb-1">Macros per Serving</p>
        <div className="text-xs text-text-secondary space-y-0.5">
          <p>Calories: {Math.round(recipe.per_serving_calories)}cal</p>
          <p>Protein: {Math.round(recipe.per_serving_protein_g)}g</p>
          <p>Fat: {Math.round(recipe.per_serving_fat_g)}g</p>
        </div>
      </div>

      {/* Add button */}
      <div className="mt-auto">
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="w-full py-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-semibold text-text shadow-md hover:shadow-lg transition-all disabled:opacity-50"
        >
          {isAdding ? "Adding..." : "Add"}
        </button>
      </div>
    </div>
  );
}
```

### 7b. Create the Explore Page

**File:** `src/app/explore_recipes/page.tsx` (create new file)

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ExploreRecipe, ExploreFilters } from "@/types/types";
import ExploreRecipeCard from "@/components/ExploreRecipeCard";
import toast from "react-hot-toast";

const CALORIE_OPTIONS = [
  { value: "", label: "All Calories" },
  { value: "under300", label: "Under 300" },
  { value: "300to500", label: "300 - 500" },
  { value: "over500", label: "Over 500" },
];

const BATCH_SIZE = 18;

export default function ExploreRecipes() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<ExploreRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [calorieRange, setCalorieRange] = useState("");

  // For debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchRecipes = useCallback(
    async (offset: number, append: boolean = false) => {
      if (offset === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: BATCH_SIZE.toString(),
          offset: offset.toString(),
        });

        if (searchTerm) params.set("search", searchTerm);
        if (category) params.set("category", category);
        if (calorieRange) params.set("calorieRange", calorieRange);

        const response = await fetch(`/api/explore-recipes?${params}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch recipes");
        }

        const data = await response.json();

        if (append) {
          setRecipes((prev) => [...prev, ...data.recipes]);
        } else {
          setRecipes(data.recipes);
        }
        setHasMore(data.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [searchTerm, category, calorieRange]
  );

  // Initial load and filter changes
  useEffect(() => {
    fetchRecipes(0, false);
  }, [category, calorieRange]); // Don't include searchTerm - handled by debounce

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchRecipes(0, false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchRecipes(recipes.length, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [recipes.length, hasMore, isLoading, isLoadingMore, fetchRecipes]);

  const handleRecipeClick = async (recipeId: number) => {
    // Increment click count
    try {
      await fetch(`/api/recipes/${recipeId}/click`, { method: "POST" });
    } catch (e) {
      // Non-critical, don't show error
    }
    router.push(`/recipe/${recipeId}`);
  };

  const handleAddRecipe = async (recipeId: number) => {
    const response = await fetch(`/api/recipes/${recipeId}/add`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to add recipe");
    }

    // Remove from list since user now has it
    setRecipes((prev) => prev.filter((r) => r.recipe_id !== recipeId));
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCategory("");
    setCalorieRange("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-6xl mx-auto px-4 pb-20">
        {/* Header */}
        <div className="flex justify-center mt-10 mb-6">
          <h1 className="text-4xl text-text font-bold">🌎 Explore Recipes</h1>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-3 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={clearSearch}
            className="px-6 py-3 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg transition-all"
          >
            Clear
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-text font-semibold">Filters</span>
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border-2 border-border rounded-xl bg-surface text-text focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">All Categories</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
            <option value="Dessert">Dessert</option>
          </select>

          {/* Calorie Filter */}
          <select
            value={calorieRange}
            onChange={(e) => setCalorieRange(e.target.value)}
            className="px-4 py-2 border-2 border-border rounded-xl bg-surface text-text focus:outline-none focus:border-accent transition-colors"
          >
            {CALORIE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error Display */}
        {error && (
          <div className="border-2 border-red-500 rounded-xl p-4 bg-red-50 mb-6">
            <p className="text-red-700 font-semibold">⚠️ {error}</p>
          </div>
        )}

        {/* Recipe Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-2xl text-text font-semibold">
              Finding delicious recipes...
            </p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-2xl text-text font-semibold mb-2">
              No recipes found
            </p>
            <p className="text-text-secondary">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <ExploreRecipeCard
                  key={recipe.recipe_id}
                  recipe={recipe}
                  onAdd={handleAddRecipe}
                  onClick={handleRecipeClick}
                />
              ))}
            </div>

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
              {isLoadingMore && (
                <p className="text-text-secondary">Loading more recipes...</p>
              )}
              {!hasMore && recipes.length > 0 && (
                <p className="text-text-secondary">You've seen all recipes!</p>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="w-full border-t-2 border-border bg-surface mt-10">
          <div className="max-w-5xl mx-auto px-4 py-6 flex justify-center">
            <button
              onClick={() => router.push("/contact")}
              className="text-text-secondary hover:text-text font-semibold transition-colors"
            >
              Contact
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
```

### 7c. Create the Click Tracking API (Optional but recommended)

**File:** `src/app/api/recipes/[id]/click/route.ts` (create new file)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { incrementRecipeClick } from "@/lib/database/incrementRecipeClick";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    await incrementRecipeClick(recipeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking click:", error);
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 },
    );
  }
}
```

---

## Step 8: Testing Checklist

### Database

- [ ] Run ALTER TABLE to add `is_created_by_user` column
- [ ] Run CREATE TABLE for `ltc_recipe_engagement`
- [ ] Verify columns exist with `DESCRIBE ltc_recipes`

### API Testing

- [ ] `GET /api/explore-recipes` returns public recipes
- [ ] Recipes from current user are excluded
- [ ] Already-added recipes are excluded
- [ ] Search filter works
- [ ] Category filter works
- [ ] Calorie range filter works
- [ ] Pagination/offset works
- [ ] `POST /api/recipes/[id]/add` creates a copy with `is_created_by_user = 0`
- [ ] Adding recipe increments `add_count` in engagement table
- [ ] `POST /api/recipes/[id]/click` increments `click_count`

### UI Testing

- [ ] Page loads at `/explore_recipes`
- [ ] Search bar filters recipes (with debounce)
- [ ] Clear button resets all filters
- [ ] Category dropdown filters correctly
- [ ] Calorie dropdown filters correctly
- [ ] Recipe cards display correctly (name, ingredients, macros, creator)
- [ ] Clicking card navigates to recipe detail
- [ ] Add button adds recipe to collection
- [ ] Added recipe disappears from list
- [ ] Infinite scroll loads more recipes
- [ ] "No recipes found" shows when results are empty
- [ ] Footer with Contact link is present

### Edge Cases

- [ ] User with no subscription hits recipe limit — shows error message
- [ ] Network error during load — shows error state
- [ ] Empty search results — shows helpful message
- [ ] Very long recipe names — don't break layout

---

## File Summary

| File                                       | Action                                                               |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `src/types/types.ts`                       | Modify — Add `is_created_by_user`, `ExploreRecipe`, `ExploreFilters` |
| `src/lib/database/getExploreRecipes.ts`    | Create — Fetch public recipes with filters                           |
| `src/lib/database/incrementRecipeClick.ts` | Create — Track recipe clicks                                         |
| `src/lib/database/copyRecipeToUser.ts`     | Create — Copy recipe to user's collection                            |
| `src/lib/database/insertRecipe.ts`         | Modify — Add `is_created_by_user = 1`                                |
| `src/app/api/explore-recipes/route.ts`     | Create — GET endpoint for explore                                    |
| `src/app/api/recipes/[id]/add/route.ts`    | Create — POST endpoint to add recipe                                 |
| `src/app/api/recipes/[id]/click/route.ts`  | Create — POST endpoint for click tracking                            |
| `src/components/ExploreRecipeCard.tsx`     | Create — Recipe card for explore page                                |
| `src/app/explore_recipes/page.tsx`         | Create — Main explore page                                           |

---

## Next Steps After Implementation

1. **Add "Make Public" toggle** — Let users mark their recipes as public from the recipe edit page
2. **Add recipe detail page** — Update `/recipe/[id]` to show "Add to Collection" button for public recipes
3. **Show popularity** — Display click/add counts on explore cards
4. **User filter** — Add the User dropdown filter from your mockup
5. **Categories API** — Create endpoint to fetch available categories dynamically

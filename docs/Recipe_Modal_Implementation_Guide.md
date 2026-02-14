# Recipe Detail Modal Implementation Guide

A step-by-step guide for converting the recipe detail page from a full page navigation to a modal overlay on the dashboard. This preserves dashboard state (selected recipes, search term, loaded recipes) when viewing a recipe and navigating back.

**Difficulty Level:** Intermediate
**Estimated Steps:** 6
**Prerequisites:** Familiarity with React state, Next.js App Router, and component composition

---

## Table of Contents

1. [Understand the Problem](#step-1-understand-the-problem)
2. [Create the RecipeDetailModal Component](#step-2-create-the-recipedetailmodal-component)
3. [Add Modal State to Dashboard](#step-3-add-modal-state-to-dashboard)
4. [Update RecipeCard to Open Modal](#step-4-update-recipecard-to-open-modal)
5. [Handle Edit and Add Flows](#step-5-handle-edit-and-add-flows)
6. [Testing Checklist](#step-6-testing-checklist)

---

## Overview

### What We're Building

- **Recipe Detail Modal** - When clicking a recipe card on the dashboard, instead of navigating to `/recipe/[id]`, a modal overlay opens on top of the dashboard
- **State Preservation** - The dashboard never unmounts, so selected recipes, search terms, and loaded recipes are all retained
- **No New Libraries** - Uses React state and standard HTML/CSS only

### Key Design Decisions

| Decision | Choice |
| --- | --- |
| Navigation approach | Modal overlay instead of full page navigation |
| State management | React useState in dashboard (no new libraries) |
| Recipe data fetching | Fetch inside modal on open (recipe data is lightweight) |
| Existing `/recipe/[id]` page | Keep it — still useful for direct links and the explore page |
| Modal close behavior | Close button + clicking outside the modal + Escape key |

### How It Works Today (The Problem)

1. User is on `/dashboard` — recipes are loaded, some are selected, search term is set
2. User clicks a recipe card → `<Link href="/recipe/123">` navigates to `/recipe/[id]`
3. Dashboard component **unmounts** — all state is destroyed
4. User clicks "Back" → navigates to `/dashboard`
5. Dashboard component **remounts** — recipes reload from API, selections are gone

### How It Will Work After (The Solution)

1. User is on `/dashboard` — same as before
2. User clicks a recipe card → modal opens **on top** of the dashboard
3. Dashboard component **stays mounted** — all state is preserved
4. User closes modal → dashboard is right where they left it, instantly

---

## Step 1: Understand the Problem

Before writing code, let's understand what's happening.

### 1a. Look at the current RecipeCard

Open `src/components/RecipeCard.tsx`. Notice this line inside the component:

```tsx
<Link href={`/recipe/${recipe_id}`} className="block">
```

This is a standard Next.js `<Link>` which triggers a **full page navigation**. When the browser navigates away from `/dashboard`, React unmounts the entire `DashboardContent` component. All `useState` values are destroyed.

### 1b. Look at the dashboard state

Open `src/app/dashboard/page.tsx`. Notice all the state at the top of `DashboardContent`:

```tsx
const [recipes, setRecipes] = useState<Recipe[]>([]);
const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
const [searchTerm, setSearchTerm] = useState("");
const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
// ... etc
```

All of this is lost on navigation and has to be rebuilt when the user comes back.

### 1c. The key insight

If we never navigate away from `/dashboard`, the component never unmounts, and all state is preserved. A modal overlay achieves this — the dashboard stays rendered behind the modal.

---

## Step 2: Create the RecipeDetailModal Component

Create a new file: `src/components/RecipeDetailModal.tsx`

This component will:
- Accept a `recipeId` prop (which recipe to show)
- Accept an `onClose` callback (to close the modal)
- Fetch the recipe data on mount
- Render the same content as the current `/recipe/[id]` page, but inside a modal

### 2a. Build the modal wrapper

The modal needs three layers:
1. **Backdrop** — a semi-transparent overlay covering the whole screen
2. **Modal container** — centered, scrollable area
3. **Modal content** — the actual recipe detail card

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Recipe, Ingredients } from "@/types/types";
import toast from "react-hot-toast";

type RecipeDetailModalProps = {
  recipeId: number;
  onClose: () => void;
};

export default function RecipeDetailModal({
  recipeId,
  onClose,
}: RecipeDetailModalProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... we'll add the rest in the next steps
}
```

### 2b. Fetch recipe data when modal opens

Add the useEffect to fetch the recipe. This is the same fetch logic from the existing `/recipe/[id]/page.tsx`:

```tsx
useEffect(() => {
  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`);
      if (!response.ok) {
        throw new Error("Recipe not found");
      }
      const data = await response.json();
      setRecipe(data.recipe);
      setIsOwner(data.isOwner);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipe");
    } finally {
      setLoading(false);
    }
  };

  fetchRecipe();
}, [recipeId]);
```

### 2c. Handle Escape key to close

Add another useEffect that listens for the Escape key:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [onClose]);
```

### 2d. Prevent body scrolling while modal is open

When the modal is open, the dashboard behind it shouldn't scroll:

```tsx
useEffect(() => {
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = "";
  };
}, []);
```

### 2e. Build the return JSX

This is the three-layer structure. The recipe card content inside is copied from the existing `src/app/recipe/[id]/page.tsx` — you're reusing the same layout.

First, add the `ingredientsBySection` logic **above** the return, inside the component body:

```tsx
// Group ingredients by section (same logic as existing page)
const ingredientsBySection = recipe
  ? recipe.ingredients_json.reduce(
      (acc, ing) => {
        const section = ing.section || "Main";
        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(ing);
        return acc;
      },
      {} as Record<string, Ingredients[]>,
    )
  : {};
```

Then the return. Note the structure carefully — there are 3 nested divs:

```
return
  └── div (backdrop)           ← fixed, full screen, semi-transparent
      └── div (modal container) ← centered, scrollable, white background
          ├── loading state
          ├── error state
          └── recipe content + buttons
```

Here's the full return:

```tsx
return (
  <div
    className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-background rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >

      {/* --- Loading State --- */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-2xl text-text-secondary animate-pulse">
            Loading recipe...
          </div>
        </div>
      )}

      {/* --- Error State --- */}
      {error && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-2xl text-accent">{error}</div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md"
          >
            Close
          </button>
        </div>
      )}

      {/* --- Recipe Content --- */}
      {recipe && (
        <>
          {/* ================================================
              COPY THE RECIPE CARD JSX HERE

              From: src/app/recipe/[id]/page.tsx
              Start: line 116 — <div className="bg-surface border-2 border-border rounded-2xl ...">
              End:   line 265 — the closing </div> of the recipe card

              This includes:
                - Header gradient bar
                - Title section (emoji, name, category, servings, times)
                - Macros section
                - Two-column ingredients & instructions
                - Footer gradient bar
              ================================================ */}

          {/* Buttons */}
          <div className="flex justify-center gap-4 p-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-surface hover:bg-muted border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              Close
            </button>

            {isOwner && (
              <button
                onClick={() => {
                  sessionStorage.setItem("recipe_edit", JSON.stringify(recipe));
                  router.push("/create_recipe");
                }}
                className="px-6 py-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Edit
              </button>
            )}
          </div>
        </>
      )}

    </div>
  </div>
);
```

### Div closing cheat sheet

To make sure you have the right number of closing tags, count from the inside out:

```
</div>     ← closes "flex justify-center gap-4 p-4" (buttons wrapper)
</>        ← closes the Fragment wrapping recipe content + buttons
</div>     ← closes "bg-background rounded-2xl" (modal container)
</div>     ← closes "fixed inset-0 bg-black/50" (backdrop)
```

That's it — 2 closing `</div>` tags at the bottom of the return after the recipe content fragment closes.

---

## Step 3: Add Modal State to Dashboard

Open `src/app/dashboard/page.tsx`. You need to add state to track which recipe is being viewed in the modal.

### 3a. Add state for the selected recipe ID

Add this alongside the other useState declarations at the top of `DashboardContent`:

```tsx
const [viewingRecipeId, setViewingRecipeId] = useState<number | null>(null);
```

### 3b. Add handler functions

Add these with the other handler functions:

```tsx
const handleRecipeClick = (recipeId: number) => {
  setViewingRecipeId(recipeId);
};

const handleModalClose = () => {
  setViewingRecipeId(null);
};
```

### 3c. Render the modal conditionally

At the top of the return JSX (right inside the outer `<div>`), add:

```tsx
import RecipeDetailModal from "@/components/RecipeDetailModal";

// ... inside the return, at the top level:

{viewingRecipeId && (
  <RecipeDetailModal
    recipeId={viewingRecipeId}
    onClose={handleModalClose}
  />
)}
```

---

## Step 4: Update RecipeCard to Open Modal

Currently, `RecipeCard` uses a `<Link>` to navigate to `/recipe/[id]`. We need to replace that with an `onClick` that tells the dashboard to open the modal.

### 4a. Add onClick prop to RecipeCard

Open `src/components/RecipeCard.tsx`. Update the props type:

```tsx
type RecipeCardProps = {
  recipe: Recipe;
  isSelected?: boolean;
  onSelect?: (recipe: Recipe, isChecked: boolean) => void;
  onDelete?: (recipeId: number) => void;
  onClick?: (recipeId: number) => void;  // ADD THIS
};
```

Add `onClick` to the destructured props:

```tsx
export default function RecipeCard({
  recipe,
  isSelected,
  onSelect,
  onDelete,
  onClick,  // ADD THIS
}: RecipeCardProps) {
```

### 4b. Replace the Link with a clickable div

Find the `<Link>` tag in the RecipeCard JSX:

```tsx
<Link href={`/recipe/${recipe_id}`} className="block">
  <h2 className="text-base text-text font-bold pr-8 truncate">{name}</h2>
  <div className="flex gap-3 mt-2 text-xs text-text-secondary">
    ...
  </div>
</Link>
```

Replace `<Link>` with a `<div>` that calls the onClick prop:

```tsx
<div
  className="block cursor-pointer"
  onClick={() => onClick?.(recipe_id)}
>
  <h2 className="text-base text-text font-bold pr-8 truncate">{name}</h2>
  <div className="flex gap-3 mt-2 text-xs text-text-secondary">
    ...
  </div>
</div>
```

You can also remove the `import Link from "next/link"` at the top since it's no longer used.

### 4c. Pass the handler from the dashboard

Back in `src/app/dashboard/page.tsx`, find where `RecipeCard` is rendered in the recipes grid:

```tsx
<RecipeCard
  key={recipe.recipe_id}
  recipe={recipe}
  isSelected={selectedRecipes.some(
    (r) => r.recipe_id === recipe.recipe_id,
  )}
  onSelect={handleRecipeSelect}
  onDelete={handleRecipeDelete}
/>
```

Add the `onClick` prop:

```tsx
<RecipeCard
  key={recipe.recipe_id}
  recipe={recipe}
  isSelected={selectedRecipes.some(
    (r) => r.recipe_id === recipe.recipe_id,
  )}
  onSelect={handleRecipeSelect}
  onDelete={handleRecipeDelete}
  onClick={handleRecipeClick}
/>
```

---

## Step 5: Handle Edit and Add Flows

### 5a. Edit flow

The Edit button in the modal already works — it stores the recipe in sessionStorage and navigates to `/create_recipe`. This is fine since editing is a deliberate action where the user expects to leave the dashboard.

No changes needed here.

### 5b. Recipe deletion from modal (optional enhancement)

If you want users to be able to delete a recipe from inside the modal, pass an `onDelete` callback:

```tsx
// In dashboard, update the modal:
{viewingRecipeId && (
  <RecipeDetailModal
    recipeId={viewingRecipeId}
    onClose={handleModalClose}
    onDelete={(recipeId) => {
      handleRecipeDelete(recipeId);
      handleModalClose();
    }}
  />
)}
```

Then add a delete button inside the modal component and call `onDelete` when clicked.

### 5c. Keep the existing /recipe/[id] page

Don't delete `src/app/recipe/[id]/page.tsx`. It's still needed for:
- Direct URL access (someone shares a recipe link)
- The explore page (which navigates to `/recipe/[id]?from=explore`)
- Bookmarked recipes

The modal is only for the dashboard flow.

---

## Step 6: Testing Checklist

Work through each scenario to make sure everything works:

### State Preservation
- [x] Select 2-3 recipes on the dashboard
- [x] Type a search term in the search bar
- [x] Click a recipe card to open the modal
- [x] Close the modal — verify selected recipes are still checked
- [x] Verify search term is still in the search bar
- [x] Verify recipes did NOT reload (no loading spinner)

### Modal Behavior
- [x] Click a recipe card — modal opens with correct recipe
- [x] Click the backdrop (dark area outside modal) — modal closes
- [x] Press Escape key — modal closes
- [x] Scroll inside the modal — only modal content scrolls, not the dashboard behind it
- [x] Click Edit button — navigates to create_recipe page with recipe data

### Modal Content
- [x] Recipe name, emoji, and category display correctly
- [x] Macros (calories, protein, carbs, fat) show correctly
- [x] Ingredients are grouped by section
- [x] Instructions are numbered and in order
- [x] Servings and cook times display correctly

### Edge Cases
- [ ] Click a recipe, close modal, click a different recipe — new recipe loads
- [ ] Rapidly open and close the modal — no crashes or stale data
- [ ] Direct URL `/recipe/123` still works as a standalone page
- [ ] Explore page recipe cards still navigate to `/recipe/[id]?from=explore`

### Checkbox vs Click Conflict
- [x] Clicking the checkbox on a recipe card should toggle selection (NOT open modal)
- [x] Clicking the recipe name/content area should open the modal (NOT toggle checkbox)
- [x] Clicking the delete trash icon should delete (NOT open modal)

This last section is important — the checkbox and delete button already use `e.stopPropagation()` and separate `onClick` handlers, so they should work independently. But verify this.

---

## Summary of Files Changed

| File | Change |
| --- | --- |
| `src/components/RecipeDetailModal.tsx` | **NEW** — Modal component |
| `src/app/dashboard/page.tsx` | Add modal state + render modal + pass onClick to RecipeCard |
| `src/components/RecipeCard.tsx` | Add onClick prop, replace Link with clickable div |

That's it — 3 files, no new dependencies. The dashboard never unmounts, so all state is automatically preserved.

import type { Recipe, Ingredients } from "@/types/types";

/**
 * Serializes a user's recipes into a compact JSON context blob for the recipe
 * assistant. The assistant is FULL-CONTEXT (no retrieval): we hand the model
 * every recipe the user owns and let it filter/reason directly. This nails the
 * fuzzy, multi-constraint questions the app's search bar/filters can't do —
 * e.g. "I've had too much chicken, find recipes with similar macros but no
 * chicken." See docs/RAG_Recipe_Assistant_Implementation_Guide.md.
 *
 * Instructions are intentionally omitted — they're token-heavy and irrelevant
 * to ingredient/macro reasoning. We keep what the model needs to filter:
 * name, category, tags, per-serving macros, times, and ingredient names.
 */

export type RecipeContextItem = {
  id: number;
  name: string;
  category: string;
  servings: number;
  tags: string[];
  per_serving: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    sugar_g: number;
  };
  time_min: { active: number; total: number };
  ingredients: string[];
};

function formatIngredient(ing: Ingredients): string {
  const qty =
    typeof ing.quantity === "number" && ing.quantity > 0 ? `${ing.quantity} ` : "";
  const unit = ing.unit ? `${ing.unit} ` : "";
  const optional = ing.optional ? " (optional)" : "";
  return `${qty}${unit}${ing.name}${optional}`.trim();
}

export function toContextItem(recipe: Recipe): RecipeContextItem {
  return {
    id: recipe.recipe_id,
    name: recipe.name,
    category: recipe.category ?? "",
    servings: recipe.servings ?? 0,
    tags: recipe.tags ?? [],
    per_serving: {
      calories: recipe.per_serving_calories ?? 0,
      protein_g: recipe.per_serving_protein_g ?? 0,
      fat_g: recipe.per_serving_fat_g ?? 0,
      carbs_g: recipe.per_serving_carbs_g ?? 0,
      sugar_g: recipe.per_serving_sugar_g ?? 0,
    },
    time_min: {
      active: recipe.time?.active_min ?? 0,
      total: recipe.time?.total_time ?? 0,
    },
    ingredients: (recipe.ingredients_json ?? []).map(formatIngredient),
  };
}

// ~4 chars per token; 240k chars ≈ 60k tokens, a safe context budget that still
// leaves plenty of room for the reply on a 128k-context model. The vast
// majority of users are nowhere near this — a typical library is a few thousand
// tokens. The cap only matters for rare power users with huge libraries.
export const DEFAULT_CONTEXT_CHAR_BUDGET = 240_000;

export type RecipeContext = {
  json: string;
  included: number;
  total: number;
  truncated: boolean;
};

/**
 * Builds the JSON context string, including as many recipes as fit within
 * `charBudget`. Recipes are expected most-recent-first (as getRecipes returns
 * them), so truncation drops the oldest recipes if a library is enormous.
 */
export function buildRecipeContext(
  recipes: Recipe[],
  charBudget: number = DEFAULT_CONTEXT_CHAR_BUDGET,
): RecipeContext {
  const items = recipes.map(toContextItem);
  const kept: RecipeContextItem[] = [];
  let size = 2; // the enclosing "[]"
  for (const item of items) {
    const itemSize = JSON.stringify(item).length + 1; // + comma
    if (kept.length > 0 && size + itemSize > charBudget) break;
    kept.push(item);
    size += itemSize;
  }
  return {
    json: JSON.stringify(kept),
    included: kept.length,
    total: items.length,
    truncated: kept.length < items.length,
  };
}

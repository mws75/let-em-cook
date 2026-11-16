import { Recipe } from "@/types/types";

/**
 * Sort options for the dashboard recipe grid.
 *
 * "updated" keeps the API's order (GET /api/get-recipes returns recipes by
 * modified_on DESC). Recipe has no created_on field, so newest/oldest use
 * recipe_id, which is an auto-increment and therefore follows creation order.
 */
export const RECIPE_SORT_OPTIONS = [
  { value: "updated", label: "Recently updated" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "calories-asc", label: "Calories (low to high)" },
  { value: "calories-desc", label: "Calories (high to low)" },
  { value: "protein-desc", label: "Protein (high to low)" },
  { value: "time-asc", label: "Total time (shortest)" },
] as const;

export type RecipeSortOption = (typeof RECIPE_SORT_OPTIONS)[number]["value"];

export const DEFAULT_RECIPE_SORT: RecipeSortOption = "updated";

const byName = (a: Recipe, b: Recipe) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });

/**
 * Returns a new sorted array; never mutates the input. Ties fall back to name
 * so the order is stable and predictable.
 */
export function sortRecipes(recipes: Recipe[], sort: RecipeSortOption): Recipe[] {
  const list = [...recipes];
  switch (sort) {
    case "updated":
      return list;
    case "newest":
      return list.sort((a, b) => b.recipe_id - a.recipe_id);
    case "oldest":
      return list.sort((a, b) => a.recipe_id - b.recipe_id);
    case "name-asc":
      return list.sort(byName);
    case "name-desc":
      return list.sort((a, b) => byName(b, a));
    case "calories-asc":
      return list.sort(
        (a, b) => a.per_serving_calories - b.per_serving_calories || byName(a, b),
      );
    case "calories-desc":
      return list.sort(
        (a, b) => b.per_serving_calories - a.per_serving_calories || byName(a, b),
      );
    case "protein-desc":
      return list.sort(
        (a, b) => b.per_serving_protein_g - a.per_serving_protein_g || byName(a, b),
      );
    case "time-asc": {
      // Recipes with no time entered (0) go last rather than first.
      const t = (r: Recipe) => r.time?.total_time || Number.POSITIVE_INFINITY;
      return list.sort((a, b) => t(a) - t(b) || byName(a, b));
    }
    default:
      return list;
  }
}

export function isRecipeSortOption(value: string): value is RecipeSortOption {
  return RECIPE_SORT_OPTIONS.some((o) => o.value === value);
}

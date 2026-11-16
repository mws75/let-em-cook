import { Recipe } from "@/types/types";
import { sortRecipes, isRecipeSortOption } from "./recipeSort";

function recipe(
  recipe_id: number,
  name: string,
  calories: number,
  protein: number,
  totalTime: number,
): Recipe {
  return {
    recipe_id,
    user_id: 1,
    user_name: "",
    is_public: 0,
    is_created_by_user: 1,
    is_favorite: 0,
    category: "dinner",
    name,
    servings: 1,
    per_serving_calories: calories,
    per_serving_protein_g: protein,
    per_serving_fat_g: 0,
    per_serving_carbs_g: 0,
    per_serving_sugar_g: 0,
    ingredients_json: [],
    instructions_json: [],
    emoji: "🍽️",
    image_url: null,
    tags: [],
    time: { active_min: 0, total_time: totalTime },
  };
}

// API order (most recently updated first) is deliberately not id order.
const recipes = [
  recipe(2, "tacos", 500, 30, 20),
  recipe(3, "Apple Pie", 400, 4, 0),
  recipe(1, "chili", 600, 40, 90),
];

const ids = (list: Recipe[]) => list.map((r) => r.recipe_id);

describe("sortRecipes", () => {
  it("keeps the API order for 'updated'", () => {
    expect(ids(sortRecipes(recipes, "updated"))).toEqual([2, 3, 1]);
  });

  it("sorts by recipe_id for newest and oldest", () => {
    expect(ids(sortRecipes(recipes, "newest"))).toEqual([3, 2, 1]);
    expect(ids(sortRecipes(recipes, "oldest"))).toEqual([1, 2, 3]);
  });

  it("sorts names case-insensitively", () => {
    expect(ids(sortRecipes(recipes, "name-asc"))).toEqual([3, 1, 2]);
    expect(ids(sortRecipes(recipes, "name-desc"))).toEqual([2, 1, 3]);
  });

  it("sorts by calories and protein", () => {
    expect(ids(sortRecipes(recipes, "calories-asc"))).toEqual([3, 2, 1]);
    expect(ids(sortRecipes(recipes, "calories-desc"))).toEqual([1, 2, 3]);
    expect(ids(sortRecipes(recipes, "protein-desc"))).toEqual([1, 2, 3]);
  });

  it("puts recipes with no total time last", () => {
    expect(ids(sortRecipes(recipes, "time-asc"))).toEqual([2, 1, 3]);
  });

  it("breaks ties by name", () => {
    const tied = [recipe(5, "Zucchini", 100, 1, 10), recipe(6, "beans", 100, 1, 10)];
    expect(ids(sortRecipes(tied, "calories-asc"))).toEqual([6, 5]);
  });

  it("does not mutate the input", () => {
    const copy = [...recipes];
    sortRecipes(recipes, "name-asc");
    expect(recipes).toEqual(copy);
  });
});

describe("isRecipeSortOption", () => {
  it("accepts known options and rejects others", () => {
    expect(isRecipeSortOption("calories-desc")).toBe(true);
    expect(isRecipeSortOption("bogus")).toBe(false);
  });
});

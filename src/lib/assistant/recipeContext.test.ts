import {
  toContextItem,
  buildRecipeContext,
  RecipeContextItem,
} from "./recipeContext";
import { Recipe } from "@/types/types";

const recipe = (overrides: Partial<Recipe>): Recipe =>
  ({
    recipe_id: 1,
    user_id: 1,
    user_name: "u",
    is_public: 0,
    is_created_by_user: 1,
    is_favorite: 0,
    category: "Dinner",
    name: "Test",
    servings: 4,
    per_serving_calories: 400,
    per_serving_protein_g: 30,
    per_serving_fat_g: 10,
    per_serving_carbs_g: 20,
    per_serving_sugar_g: 5,
    ingredients_json: [],
    instructions_json: [],
    emoji: "🍽️",
    image_url: null,
    tags: [],
    time: { active_min: 10, total_time: 30 },
    ...overrides,
  }) as Recipe;

describe("toContextItem", () => {
  it("maps macros, category, tags, times and ingredient names", () => {
    const item = toContextItem(
      recipe({
        recipe_id: 7,
        name: "Chicken Soup",
        tags: ["soup", "comfort"],
        ingredients_json: [
          { name: "chicken breast", quantity: 1, unit: "lb", section: "main" },
          { name: "carrot", quantity: 2, unit: "", section: "main" },
          { name: "parsley", quantity: 0, unit: "", optional: true, section: "garnish" },
        ],
      }),
    );
    expect(item).toEqual<RecipeContextItem>({
      id: 7,
      name: "Chicken Soup",
      category: "Dinner",
      servings: 4,
      tags: ["soup", "comfort"],
      per_serving: { calories: 400, protein_g: 30, fat_g: 10, carbs_g: 20, sugar_g: 5 },
      time_min: { active: 10, total: 30 },
      ingredients: ["1 lb chicken breast", "2 carrot", "parsley (optional)"],
    });
  });

  it("does not include instructions", () => {
    const item = toContextItem(
      recipe({ instructions_json: [{ step: 1, text: "secret" }] }),
    );
    expect(JSON.stringify(item)).not.toContain("secret");
  });
});

describe("buildRecipeContext", () => {
  it("includes all recipes when within budget and reports counts", () => {
    const ctx = buildRecipeContext([recipe({ recipe_id: 1 }), recipe({ recipe_id: 2 })]);
    expect(ctx.included).toBe(2);
    expect(ctx.total).toBe(2);
    expect(ctx.truncated).toBe(false);
    const parsed = JSON.parse(ctx.json);
    expect(parsed).toHaveLength(2);
  });

  it("truncates oldest recipes when over budget and always keeps at least one", () => {
    const many = Array.from({ length: 50 }, (_, i) => recipe({ recipe_id: i + 1 }));
    const ctx = buildRecipeContext(many, 500); // tiny budget
    expect(ctx.truncated).toBe(true);
    expect(ctx.included).toBeGreaterThanOrEqual(1);
    expect(ctx.included).toBeLessThan(50);
    expect(ctx.total).toBe(50);
  });

  it("produces valid JSON", () => {
    const ctx = buildRecipeContext([recipe({})]);
    expect(() => JSON.parse(ctx.json)).not.toThrow();
  });
});

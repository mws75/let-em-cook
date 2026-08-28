import { buildRecipeDocument, recipeDocumentKey } from "./recipeDocument";
import { Recipe } from "@/types/types";

const recipe = (overrides: Partial<Recipe>): Recipe =>
  ({
    recipe_id: 1337,
    user_id: 42,
    user_name: "u",
    is_public: 0,
    is_created_by_user: 1,
    is_favorite: 0,
    category: "Dinner",
    name: "Lemon Garlic Chicken",
    servings: 4,
    per_serving_calories: 420,
    per_serving_protein_g: 38,
    per_serving_fat_g: 18,
    per_serving_carbs_g: 12,
    per_serving_sugar_g: 3,
    ingredients_json: [],
    instructions_json: [],
    emoji: "🍗",
    image_url: null,
    tags: [],
    time: { active_min: 15, total_time: 35 },
    ...overrides,
  }) as Recipe;

describe("recipeDocumentKey", () => {
  it("namespaces by user then recipe under rag/recipes/", () => {
    expect(recipeDocumentKey(42, 1337)).toBe("rag/recipes/42/1337.md");
  });
});

describe("buildRecipeDocument", () => {
  it("includes the title, id, category, servings and times", () => {
    const doc = buildRecipeDocument(recipe({}));
    expect(doc).toContain("# Lemon Garlic Chicken");
    expect(doc).toContain("- Recipe ID: 1337");
    expect(doc).toContain("- Category: Dinner");
    expect(doc).toContain("- Servings: 4");
    expect(doc).toContain("Active time: 15 min");
    expect(doc).toContain("Total time: 35 min");
  });

  it("embeds per-serving macros as readable text", () => {
    const doc = buildRecipeDocument(recipe({}));
    expect(doc).toContain("## Macros (per serving)");
    expect(doc).toContain("- Calories: 420");
    expect(doc).toContain("- Protein: 38 g");
    expect(doc).toContain("- Fat: 18 g");
    expect(doc).toContain("- Carbs: 12 g");
    expect(doc).toContain("- Sugar: 3 g");
  });

  it("renders tags when present and omits the line when empty", () => {
    expect(buildRecipeDocument(recipe({ tags: ["high-protein", "quick"] }))).toContain(
      "- Tags: high-protein, quick",
    );
    expect(buildRecipeDocument(recipe({ tags: [] }))).not.toContain("- Tags:");
  });

  it("formats ingredients with quantity, unit, prep and optional marker", () => {
    const doc = buildRecipeDocument(
      recipe({
        ingredients_json: [
          { name: "chicken breast", quantity: 1.5, unit: "lb", section: "main" },
          { name: "garlic", quantity: 4, unit: "clove", prep: "minced", section: "main" },
          { name: "parsley", quantity: 0, unit: "", optional: true, section: "garnish" },
        ],
      }),
    );
    expect(doc).toContain("## Ingredients");
    expect(doc).toContain("- 1.5 lb chicken breast");
    expect(doc).toContain("- 4 clove garlic (minced)");
    expect(doc).toContain("- parsley [optional]");
  });

  it("orders instructions by step number", () => {
    const doc = buildRecipeDocument(
      recipe({
        instructions_json: [
          { step: 2, text: "Sear the chicken." },
          { step: 1, text: "Season the chicken." },
        ],
      }),
    );
    const seasonIdx = doc.indexOf("1. Season the chicken.");
    const searIdx = doc.indexOf("2. Sear the chicken.");
    expect(seasonIdx).toBeGreaterThan(-1);
    expect(searIdx).toBeGreaterThan(seasonIdx);
  });

  it("falls back to 0 for missing macros without throwing", () => {
    const doc = buildRecipeDocument(
      recipe({
        per_serving_calories: undefined as unknown as number,
        per_serving_protein_g: undefined as unknown as number,
      }),
    );
    expect(doc).toContain("- Calories: 0");
    expect(doc).toContain("- Protein: 0 g");
  });

  it("ends with a single trailing newline", () => {
    const doc = buildRecipeDocument(recipe({}));
    expect(doc.endsWith("\n")).toBe(true);
    expect(doc.endsWith("\n\n")).toBe(false);
  });
});

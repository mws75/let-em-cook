import {
  ZERO_MACROS,
  addMacros,
  sumDailyLogEntries,
  sumRecipeMacros,
} from "./macros";
import { DailyLogEntry, Recipe } from "@/types/types";

const recipe = (overrides: Partial<Recipe>): Recipe =>
  ({
    recipe_id: 1,
    user_id: 1,
    user_name: "u",
    is_public: 0,
    is_created_by_user: 1,
    category: "",
    name: "Test",
    servings: 1,
    per_serving_calories: 0,
    per_serving_protein_g: 0,
    per_serving_fat_g: 0,
    per_serving_carbs_g: 0,
    per_serving_sugar_g: 0,
    ingredients_json: [],
    instructions_json: [],
    emoji: "",
    tags: [],
    time: { active_min: 0, total_time: 0 },
    ...overrides,
  }) as Recipe;

const entry = (overrides: Partial<DailyLogEntry>): DailyLogEntry => ({
  id: "id",
  slot: "breakfast",
  kind: "manual",
  name: "Test",
  servings: 1,
  calories: null,
  protein_g: null,
  fat_g: null,
  carbs_g: null,
  sugar_g: null,
  logged_at: "2026-04-30T08:00:00Z",
  ...overrides,
});

describe("addMacros", () => {
  it("returns the field-wise sum of two macros", () => {
    expect(
      addMacros(
        { calories: 100, protein: 10, fat: 5, carbs: 20, sugar: 2 },
        { calories: 50, protein: 6, fat: 3, carbs: 8, sugar: 1 },
      ),
    ).toEqual({ calories: 150, protein: 16, fat: 8, carbs: 28, sugar: 3 });
  });

  it("ZERO_MACROS is the additive identity", () => {
    const m = { calories: 1, protein: 2, fat: 3, carbs: 4, sugar: 5 };
    expect(addMacros(m, ZERO_MACROS)).toEqual(m);
  });
});

describe("sumRecipeMacros", () => {
  it("returns ZERO_MACROS for an empty list", () => {
    expect(sumRecipeMacros([])).toEqual(ZERO_MACROS);
  });

  it("sums per-serving macros across recipes and rounds each component", () => {
    const result = sumRecipeMacros([
      recipe({
        per_serving_calories: 420.4,
        per_serving_protein_g: 28.6,
        per_serving_fat_g: 18.2,
        per_serving_carbs_g: 30.7,
        per_serving_sugar_g: 4.1,
      }),
      recipe({
        per_serving_calories: 180.5,
        per_serving_protein_g: 9.5,
        per_serving_fat_g: 7.5,
        per_serving_carbs_g: 22.5,
        per_serving_sugar_g: 11.5,
      }),
    ]);
    // 420 + 181 = 601 (each rounded independently before summing)
    expect(result.calories).toBe(601);
    expect(result.protein).toBe(29 + 10);
    expect(result.fat).toBe(18 + 8);
    expect(result.carbs).toBe(31 + 23);
    expect(result.sugar).toBe(4 + 12);
  });

  it("treats missing macro fields as zero", () => {
    const result = sumRecipeMacros([
      recipe({ per_serving_calories: undefined as unknown as number }),
    ]);
    expect(result).toEqual(ZERO_MACROS);
  });
});

describe("sumDailyLogEntries", () => {
  it("returns ZERO_MACROS for an empty list", () => {
    expect(sumDailyLogEntries([])).toEqual(ZERO_MACROS);
  });

  it("sums entries and treats null fields as zero", () => {
    const result = sumDailyLogEntries([
      entry({ calories: 200, protein_g: 20, fat_g: 5, carbs_g: 10, sugar_g: 3 }),
      entry({ calories: null, protein_g: 8, fat_g: null, carbs_g: 15, sugar_g: null }),
    ]);
    expect(result).toEqual({
      calories: 200,
      protein: 28,
      fat: 5,
      carbs: 25,
      sugar: 3,
    });
  });

  it("rounds each component before summing", () => {
    const result = sumDailyLogEntries([
      entry({ calories: 100.4 }),
      entry({ calories: 100.4 }),
    ]);
    // Each rounds to 100 → 200, not 200.8 → 201
    expect(result.calories).toBe(200);
  });
});

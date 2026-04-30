import { DailyLogEntry, Recipe } from "@/types/types";

export type Macros = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar: number;
};

export const ZERO_MACROS: Macros = {
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  sugar: 0,
};

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    sugar: a.sugar + b.sugar,
    carbs: a.carbs + b.carbs,
  };
}

export function sumRecipeMacros(recipes: Recipe[]): Macros {
  return recipes.reduce<Macros>(
    (acc, r) => ({
      calories: acc.calories + Math.round(r.per_serving_calories ?? 0),
      protein: acc.protein + Math.round(r.per_serving_protein_g ?? 0),
      fat: acc.fat + Math.round(r.per_serving_fat_g ?? 0),
      carbs: acc.carbs + Math.round(r.per_serving_carbs_g ?? 0),
      sugar: acc.sugar + Math.round(r.per_serving_sugar_g ?? 0),
    }),
    { ...ZERO_MACROS },
  );
}

export function sumDailyLogEntries(entries: DailyLogEntry[]): Macros {
  return entries.reduce<Macros>(
    (acc, e) => ({
      calories: acc.calories + Math.round(e.calories ?? 0),
      protein: acc.protein + Math.round(e.protein_g ?? 0),
      fat: acc.fat + Math.round(e.fat_g ?? 0),
      carbs: acc.carbs + Math.round(e.carbs_g ?? 0),
      sugar: acc.sugar + Math.round(e.sugar_g ?? 0),
    }),
    { ...ZERO_MACROS },
  );
}

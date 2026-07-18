// USDA FoodData Central provider.
//
// Endpoint used:
//   GET /v1/foods/search   — search; returns matched foods with fdcId, per-100g
//                            nutrients, and foodPortions.
//
// Auth is a single api_key query param. Free, no attribution, no commercial
// restrictions. Nutrients come back per 100g; we normalise to a serving when a
// foodPortions array is present, else expose a "100 g" serving. Search results
// carry per_100g + available_servings, so the client recomputes any serving
// change locally — there's no separate resolve round-trip.

import {
  FoodMacros,
  FoodProvider,
  FoodSearchResult,
  ProviderUnavailableError,
  ServingOption,
  scaleFrom100g,
} from "./provider";

const BASE = "https://api.nal.usda.gov/fdc/v1";
const TIMEOUT_MS = 8000;

// Two parallel rankings, merged whole-foods-first. Keep the whole-food list
// short (the raw ingredient is usually near the top) so a branded product isn't
// buried behind a long tail of generic variants — e.g. "cup noodles" shouldn't
// need 10 generic-noodle rows scrolled past to reach Nissin. Branded gets more
// room for the packaged/prepared long tail.
const WHOLE_PAGE_SIZE = 7;
const BRANDED_PAGE_SIZE = 15;

// USDA nutrient numbers we care about.
const N_ENERGY_KCAL = "208";
// Foundation foods usually omit 208 and report energy only as Atwater factors:
// 957 (general 4-4-9 style) and 958 (food-specific factors). Prefer 208, then
// the general factor, then the specific one.
const N_ENERGY_ATWATER_GENERAL = "957";
const N_ENERGY_ATWATER_SPECIFIC = "958";
const N_PROTEIN = "203";
const N_FAT = "204";
const N_CARBS = "205";
const N_SUGARS = "269";

function apiKey(): string | null {
  return process.env.USDA_API_KEY ?? null;
}

type UsdaNutrient = {
  nutrientNumber?: string;
  number?: string; // older shape
  value?: number;
  amount?: number;
  nutrientName?: string;
};
type UsdaPortion = {
  amount?: number;
  modifier?: string;
  portionDescription?: string; // Foundation foods label portions here
  measureUnit?: { name?: string };
  gramWeight?: number;
};
type UsdaFood = {
  fdcId: number;
  dataType?: string; // "Foundation" | "SR Legacy" | "Branded"
  description: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string; // branded, e.g. "1 CONTAINER", "2 tbsp"
  foodNutrients?: UsdaNutrient[];
  foodPortions?: UsdaPortion[];
};
type UsdaSearchResponse = { foods?: UsdaFood[] };

function withTimeout(signal?: AbortSignal): {
  signal: AbortSignal;
  clear: () => void;
} {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: ctrl.signal,
    clear: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

function nutrientValue(food: UsdaFood, num: string): number | null {
  const n = food.foodNutrients?.find(
    (x) => (x.nutrientNumber ?? x.number) === num,
  );
  if (!n) return null;
  const v = n.value ?? n.amount;
  return typeof v === "number" ? v : null;
}

// Energy in kcal, tolerating the Foundation/SR Legacy split: 208 first, then
// Atwater general (957), then Atwater specific (958). Without this, Foundation
// foods (e.g. "Apples, fuji, with skin, raw") come back with null calories.
function energyKcal(food: UsdaFood): number | null {
  return (
    nutrientValue(food, N_ENERGY_KCAL) ??
    nutrientValue(food, N_ENERGY_ATWATER_GENERAL) ??
    nutrientValue(food, N_ENERGY_ATWATER_SPECIFIC)
  );
}

// Macros per 100g, straight from foodNutrients.
function macrosPer100g(food: UsdaFood): FoodMacros {
  return {
    calories: energyKcal(food),
    protein_g: nutrientValue(food, N_PROTEIN),
    fat_g: nutrientValue(food, N_FAT),
    carbs_g: nutrientValue(food, N_CARBS),
    sugar_g: nutrientValue(food, N_SUGARS),
  };
}

// A serving synthesised from a branded item's label: servingSize (grams) plus
// householdServingFullText ("1 CONTAINER", "2 tbsp"). Branded foods carry no
// foodPortions, so this is their only human-friendly serving. Whole foods lack
// these label fields, so this returns null for them.
function labelServing(food: UsdaFood): ServingOption | null {
  const grams = food.servingSize;
  const house = food.householdServingFullText?.trim();
  if (!grams || (food.servingSizeUnit ?? "").toLowerCase() !== "g" || !house) {
    return null;
  }
  return {
    label: `${house} (${Math.round(grams)} g)`,
    grams,
    qty: 1,
    unit: "serving",
  };
}

function servingsFromPortions(food: UsdaFood): ServingOption[] {
  const out: ServingOption[] = [];
  // Branded label serving first, when present.
  const label = labelServing(food);
  if (label) out.push(label);
  for (const p of food.foodPortions ?? []) {
    if (!p.gramWeight) continue;
    // Survey (FNDDS) foods put a numeric measure code in `modifier` and the real
    // label in `portionDescription`; Foundation/SR Legacy use a text `modifier`.
    // Ignore a purely-numeric modifier so we never surface "1 90000".
    const modifier =
      p.modifier && !/^\d+$/.test(p.modifier.trim()) ? p.modifier : undefined;
    let unit =
      modifier || p.portionDescription || p.measureUnit?.name || "serving";
    // "RACC" (FDA Reference Amount Customarily Consumed) is USDA jargon; show a
    // plain "serving" instead — the gram weight in the label carries the detail.
    if (unit.toUpperCase() === "RACC") unit = "serving";
    const qty = p.amount ?? 1;
    // Append the gram weight so every option is self-explanatory: "1 medium
    // (182 g)". The bare "100 g" fallback already states its grams — don't double.
    const label =
      unit.toLowerCase() === "g"
        ? `${qty} ${unit}`
        : `${qty} ${unit} (${Math.round(p.gramWeight)} g)`;
    out.push({ label, grams: p.gramWeight, qty, unit });
  }
  // Always offer a raw 100 g option — many USDA foods have no portions.
  out.push({ label: "100 g", grams: 100, qty: 100, unit: "g" });
  return out;
}

function defaultServing(food: UsdaFood): ServingOption {
  // Prefer a branded label serving ("1 CONTAINER (64 g)"), then a bare
  // servingSize in grams, then the first portion, else 100 g.
  const label = labelServing(food);
  if (label) return label;
  const portions = servingsFromPortions(food);
  if (food.servingSize && (food.servingSizeUnit ?? "").toLowerCase() === "g") {
    return {
      label: `${food.servingSize} g`,
      grams: food.servingSize,
      qty: food.servingSize,
      unit: "g",
    };
  }
  return portions[0];
}

// Normalise one USDA food (any dataset) into our shape. Branded items expose a
// per-100g `foodNutrients` array just like whole foods, so the scaling is
// identical; only the default serving differs (label vs foodPortions).
function mapFood(food: UsdaFood): FoodSearchResult {
  const serving = defaultServing(food);
  const per100g = macrosPer100g(food);
  const grams = serving.grams ?? 100;
  return {
    source: "usda" as const,
    external_id: String(food.fdcId),
    name: food.description,
    brand: food.brandName || food.brandOwner || undefined,
    default_serving_label: serving.label,
    default_serving_grams: grams,
    per_serving: scaleFrom100g(per100g, grams),
    per_100g: per100g,
    available_servings: servingsFromPortions(food),
  };
}

// Branded search results are riddled with near-duplicates — the same product
// under many UPCs/pack sizes (e.g. "CHEDDAR CHEESE — WEIS" ×3). Collapse by
// brand + name, keeping the first (most relevant) of each.
function dedupeBranded(results: FoodSearchResult[]): FoodSearchResult[] {
  const seen = new Set<string>();
  const out: FoodSearchResult[] = [];
  for (const r of results) {
    const key = `${r.brand ?? ""}|${r.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export class UsdaProvider implements FoodProvider {
  readonly source = "usda" as const;

  isConfigured(): boolean {
    return apiKey() !== null;
  }

  async search(query: string, signal?: AbortSignal): Promise<FoodSearchResult[]> {
    const key = apiKey();
    if (!key) throw new ProviderUnavailableError("usda", "Missing API key");

    // Whole foods and branded products are fetched as two separate relevance
    // rankings, then merged whole-foods-first. A single mixed query buries the
    // raw ingredient — e.g. "Cheese, cheddar" sits at result #30 behind dozens of
    // near-duplicate branded packages. Two lists keep each ranking clean and
    // guarantee both a whole food and branded options surface. Branded items DO
    // carry per-100g `foodNutrients` (verified against the API), so they scale
    // exactly like whole foods — the old "branded is per-serving only" exclusion
    // was mistaken.
    const [wholeR, brandedR] = await Promise.allSettled([
      this.fetchDataset(query, "Foundation,SR Legacy", WHOLE_PAGE_SIZE, key, signal),
      this.fetchDataset(query, "Branded", BRANDED_PAGE_SIZE, key, signal),
    ]);

    // Only a total failure is an error the orchestrator should report; if one
    // dataset succeeds we still have useful results.
    if (wholeR.status === "rejected" && brandedR.status === "rejected") {
      throw wholeR.reason instanceof ProviderUnavailableError
        ? wholeR.reason
        : new ProviderUnavailableError("usda", "search failed");
    }

    const whole = wholeR.status === "fulfilled" ? wholeR.value : [];
    const branded = brandedR.status === "fulfilled" ? brandedR.value : [];
    return [...whole, ...dedupeBranded(branded)];
  }

  private async fetchDataset(
    query: string,
    dataType: string,
    pageSize: number,
    key: string,
    signal?: AbortSignal,
  ): Promise<FoodSearchResult[]> {
    const { signal: s, clear } = withTimeout(signal);
    try {
      const url =
        `${BASE}/foods/search?api_key=${encodeURIComponent(key)}` +
        `&query=${encodeURIComponent(query)}&pageSize=${pageSize}` +
        `&dataType=${encodeURIComponent(dataType)}`;
      const res = await fetch(url, { signal: s });
      if (!res.ok) {
        throw new ProviderUnavailableError("usda", `foods/search ${res.status}`);
      }
      const data = (await res.json()) as UsdaSearchResponse;
      return (data.foods ?? []).map(mapFood);
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw err;
      throw new ProviderUnavailableError(
        "usda",
        err instanceof Error ? err.message : "search failed",
      );
    } finally {
      clear();
    }
  }

  // Fetch the portion list for one food from the detail endpoint. USDA's
  // /foods/search response never carries foodPortions, so real servings
  // ("1 medium", "1 cup, sliced") are only obtainable here — one request per
  // user selection. Macros still scale from the search result's per_100g, so we
  // return portions only.
  async getServings(
    fdcId: string,
    signal?: AbortSignal,
  ): Promise<ServingOption[]> {
    const key = apiKey();
    if (!key) throw new ProviderUnavailableError("usda", "Missing API key");

    const { signal: s, clear } = withTimeout(signal);
    try {
      const url =
        `${BASE}/food/${encodeURIComponent(fdcId)}` +
        `?api_key=${encodeURIComponent(key)}`;
      const res = await fetch(url, { signal: s });
      if (!res.ok) {
        throw new ProviderUnavailableError("usda", `food/${fdcId} ${res.status}`);
      }
      const food = (await res.json()) as UsdaFood;
      return servingsFromPortions(food);
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw err;
      throw new ProviderUnavailableError(
        "usda",
        err instanceof Error ? err.message : "getServings failed",
      );
    } finally {
      clear();
    }
  }
}

export const usda = new UsdaProvider();

// Food-database provider abstraction.
//
// Nothing in the UI knows which provider answered a search. Today there's one
// implementation (UsdaProvider); each normalises its wire shape into the
// FoodSearchResult below. See `searchFoods.ts` for the orchestrator.
//
// Search results carry per_100g + available_servings, so the client recomputes
// any serving change locally — there is no separate resolve round-trip.

// Only USDA today (free, no signup beyond one API key). The interface stays
// provider-agnostic so a richer natural-language provider (Edamam, FatSecret,
// …) can be added later behind the same seam without UI changes.
export type FoodSource = "usda";

// A single set of per-serving (or per-100g) macros. Any field may be null when
// the provider didn't supply it — the UI renders nulls as blank/editable.
export type FoodMacros = {
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sugar_g: number | null;
};

export type ServingOption = {
  label: string; // "1 medium", "1 cup, sliced", "100 g"
  grams?: number; // weight of one of these servings, when known
  qty: number; // 1 (for "1 medium"), 100 (for "100 g")
  unit: string; // "medium", "cup, sliced", "g"
};

export type FoodSearchResult = {
  source: FoodSource;
  external_id: string; // USDA fdcId as string
  name: string; // "Apple, raw, with skin"
  brand?: string; // "Honeycrisp" | "Nature Valley" | undefined
  default_serving_label: string; // "1 medium (182g)"
  default_serving_grams?: number;
  per_serving: FoodMacros;
  // Serving-independent macros per 100g. The client scales these locally when
  // the user changes serving/quantity, so no follow-up request is needed.
  // Present for USDA; may be omitted by providers that only return per-serving.
  per_100g?: FoodMacros | null;
  available_servings?: ServingOption[];
};

export interface FoodProvider {
  readonly source: FoodSource;
  /** True when the provider has the credentials it needs to run. */
  isConfigured(): boolean;
  search(query: string, signal?: AbortSignal): Promise<FoodSearchResult[]>;
  /**
   * Fetch the human-friendly serving options ("1 medium", "1 cup, sliced") for a
   * single food. USDA's search endpoint omits `foodPortions` — they live only on
   * the detail endpoint — so this is a per-selection round-trip the UI makes when
   * a user taps a result. Returns whatever portions the provider has (always at
   * least a "100 g" option); callers keep their search-time fallback on throw.
   * Optional: a provider that already returns full servings from `search` can
   * omit it.
   */
  getServings?(externalId: string, signal?: AbortSignal): Promise<ServingOption[]>;
}

// Thrown when a provider can't fulfil a request (missing creds, rate-limited,
// 5xx, timeout). The orchestrator catches this and reports it as a reachability
// error rather than "no results".
export class ProviderUnavailableError extends Error {
  constructor(
    public readonly source: FoodSource,
    message: string,
  ) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

// Round helpers — calories to whole numbers, grams to one decimal, matching how
// recipe macros are stored.
export function roundCalories(n: number | null | undefined): number | null {
  if (n == null || Number.isNaN(n)) return null;
  return Math.round(n);
}

export function roundGrams(n: number | null | undefined): number | null {
  if (n == null || Number.isNaN(n)) return null;
  return Math.round(n * 10) / 10;
}

export function scaleMacros(macros: FoodMacros, factor: number): FoodMacros {
  return {
    calories: macros.calories == null ? null : roundCalories(macros.calories * factor),
    protein_g: macros.protein_g == null ? null : roundGrams(macros.protein_g * factor),
    fat_g: macros.fat_g == null ? null : roundGrams(macros.fat_g * factor),
    carbs_g: macros.carbs_g == null ? null : roundGrams(macros.carbs_g * factor),
    sugar_g: macros.sugar_g == null ? null : roundGrams(macros.sugar_g * factor),
  };
}

// Scale per-100g macros to an arbitrary gram weight. The workhorse for USDA,
// whose nutrients are always reported per 100g.
export function scaleFrom100g(per100g: FoodMacros, grams: number): FoodMacros {
  return scaleMacros(per100g, grams / 100);
}

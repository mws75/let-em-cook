// Food lookup orchestrator.
//
// Today there is a single provider (USDA). The loop below is the seam where a
// richer natural-language provider could be added as the primary, with USDA as
// the fallback. Callers (the API route) only ever touch this file.
//
// Search results carry per_100g + available_servings, so the client recomputes
// serving/quantity changes locally — there is no resolve round-trip or cache.

import { usda } from "./usda";
import { parseFoodQuery, ParsedFoodQuery } from "./parseQuery";
import {
  FoodProvider,
  FoodSearchResult,
  FoodSource,
  ProviderUnavailableError,
  ServingOption,
} from "./provider";

// Primary → fallback order. Add new providers ahead of `usda` later.
const PROVIDERS: FoodProvider[] = [usda];

const MIN_QUERY_LENGTH = 2;

// "ok"    — at least one result
// "empty" — a provider ran successfully but returned nothing
// "error" — no provider could run (unconfigured) or every provider threw
export type FoodSearchStatus = "ok" | "empty" | "error";

export type FoodSearchResponse = {
  results: FoodSearchResult[];
  parsed: ParsedFoodQuery | null;
  source: FoodSource | null;
  status: FoodSearchStatus;
};

/**
 * Parse the raw query, then search providers in order until one returns
 * results. The parsed quantity/unit is returned alongside so the UI can prefill
 * the servings stepper and pre-select a matching serving.
 */
export async function searchFoods(
  rawQuery: string,
  signal?: AbortSignal,
): Promise<FoodSearchResponse> {
  const parsed = parseFoodQuery(rawQuery);
  const term = (parsed.foodName || rawQuery).trim();
  if (term.length < MIN_QUERY_LENGTH) {
    return { results: [], parsed, source: null, status: "empty" };
  }

  let ranOk = false; // a provider returned a (possibly empty) response

  for (const provider of PROVIDERS) {
    if (!provider.isConfigured()) continue;
    try {
      const results = await provider.search(term, signal);
      ranOk = true;
      if (results.length > 0) {
        return { results, parsed, source: provider.source, status: "ok" };
      }
    } catch (err) {
      if (!(err instanceof ProviderUnavailableError)) {
        console.error("Food search provider error", err);
      }
      // Fall through to the next provider.
    }
  }

  // ranOk → a provider genuinely found nothing; otherwise nothing could run
  // (no API key, or every provider errored) which is a reachability problem.
  return {
    results: [],
    parsed,
    source: null,
    status: ranOk ? "empty" : "error",
  };
}

/**
 * Fetch the serving options ("1 medium", "1 cup, sliced") for a single food.
 * The search endpoint omits portions for USDA, so the UI calls this once when a
 * user selects a result. Returns [] when the source is unknown, unconfigured, or
 * doesn't implement per-food serving lookup — callers keep their fallback.
 */
export async function getFoodServings(
  source: FoodSource,
  externalId: string,
  signal?: AbortSignal,
): Promise<ServingOption[]> {
  const provider = PROVIDERS.find((p) => p.source === source);
  if (!provider || !provider.isConfigured() || !provider.getServings) return [];
  return provider.getServings(externalId, signal);
}

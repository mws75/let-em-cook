// Mock the provider so we can assert the orchestrator's wiring: query parsing,
// the ok/empty/error status, and the unconfigured/error fallthrough.
jest.mock("./usda", () => ({
  usda: {
    source: "usda",
    isConfigured: jest.fn(() => true),
    search: jest.fn(),
    getServings: jest.fn(),
  },
}));

import { searchFoods, getFoodServings } from "./searchFoods";
import { usda } from "./usda";
import { FoodSearchResult, ProviderUnavailableError } from "./provider";

const mockUsda = usda as jest.Mocked<typeof usda>;

const result = (over: Partial<FoodSearchResult> = {}): FoodSearchResult => ({
  source: "usda",
  external_id: "1",
  name: "Apples, raw",
  default_serving_label: "1 large",
  default_serving_grams: 223,
  per_serving: { calories: 116, protein_g: 0.6, fat_g: 0.4, carbs_g: 31, sugar_g: 23 },
  per_100g: { calories: 52, protein_g: 0.26, fat_g: 0.17, carbs_g: 13.8, sugar_g: 10.4 },
  available_servings: [{ label: "100 g", grams: 100, qty: 100, unit: "g" }],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUsda.isConfigured.mockReturnValue(true);
});

describe("searchFoods", () => {
  it("parses the query and searches the provider with the food name", async () => {
    mockUsda.search.mockResolvedValueOnce([result()]);

    const res = await searchFoods("2 large apples");

    expect(mockUsda.search).toHaveBeenCalledWith("apples", undefined);
    expect(res.status).toBe("ok");
    expect(res.source).toBe("usda");
    expect(res.results).toHaveLength(1);
    expect(res.parsed?.qty).toBe(2);
    expect(res.parsed?.unit).toBe("large");
  });

  it("short-circuits queries under the minimum length", async () => {
    const res = await searchFoods("a");
    expect(res.results).toEqual([]);
    expect(res.status).toBe("empty");
    expect(mockUsda.search).not.toHaveBeenCalled();
  });

  it("reports 'empty' when a provider runs but finds nothing", async () => {
    mockUsda.search.mockResolvedValueOnce([]);
    const res = await searchFoods("zxqw");
    expect(res.results).toEqual([]);
    expect(res.status).toBe("empty");
    expect(res.source).toBeNull();
  });

  it("reports 'error' when no provider is configured", async () => {
    mockUsda.isConfigured.mockReturnValue(false);
    const res = await searchFoods("apple");
    expect(res.status).toBe("error");
    expect(mockUsda.search).not.toHaveBeenCalled();
  });

  it("reports 'error' when the provider throws", async () => {
    mockUsda.search.mockRejectedValueOnce(
      new ProviderUnavailableError("usda", "boom"),
    );
    const res = await searchFoods("apple");
    expect(res.results).toEqual([]);
    expect(res.status).toBe("error");
    expect(res.source).toBeNull();
  });
});

describe("getFoodServings", () => {
  const servings = [
    { label: "1 medium", grams: 182, qty: 1, unit: "medium" },
    { label: "100 g", grams: 100, qty: 100, unit: "g" },
  ];

  it("delegates to the matching configured provider", async () => {
    mockUsda.getServings.mockResolvedValueOnce(servings);
    const out = await getFoodServings("usda", "1102644");
    expect(mockUsda.getServings).toHaveBeenCalledWith("1102644", undefined);
    expect(out).toEqual(servings);
  });

  it("returns [] when the provider is not configured", async () => {
    mockUsda.isConfigured.mockReturnValue(false);
    const out = await getFoodServings("usda", "1102644");
    expect(out).toEqual([]);
    expect(mockUsda.getServings).not.toHaveBeenCalled();
  });

  it("returns [] for an unknown source", async () => {
    const out = await getFoodServings(
      "nutritionix" as unknown as Parameters<typeof getFoodServings>[0],
      "x",
    );
    expect(out).toEqual([]);
    expect(mockUsda.getServings).not.toHaveBeenCalled();
  });
});

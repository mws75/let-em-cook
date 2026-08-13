import { usda } from "./usda";
import { ProviderUnavailableError } from "./provider";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const ok = (body: unknown) => ({ ok: true, json: async () => body });

// A USDA "Apples, raw" style search result: 52 kcal / 100g, one large portion.
const appleSearch = {
  foods: [
    {
      fdcId: 1102644,
      description: "Apples, raw, with skin",
      foodNutrients: [
        { nutrientNumber: "208", value: 52 },
        { nutrientNumber: "203", value: 0.26 },
        { nutrientNumber: "204", value: 0.17 },
        { nutrientNumber: "205", value: 13.8 },
        { nutrientNumber: "269", value: 10.4 },
      ],
      foodPortions: [
        { amount: 1, modifier: "large", gramWeight: 223 },
        { amount: 1, modifier: "medium", gramWeight: 182 },
      ],
    },
  ],
};

// A USDA "Branded" result: it exposes a per-100g foodNutrients array exactly
// like whole foods (453 kcal/100g), plus label serving fields (64 g container).
const cupNoodlesBranded = {
  foods: [
    {
      fdcId: 2000001,
      dataType: "Branded",
      description: "CUP NOODLES, BEEF",
      brandName: "Nissin",
      servingSize: 64,
      servingSizeUnit: "g",
      householdServingFullText: "1 CONTAINER",
      foodNutrients: [
        { nutrientNumber: "208", value: 453 },
        { nutrientNumber: "203", value: 10.9 },
        { nutrientNumber: "204", value: 17.2 },
        { nutrientNumber: "205", value: 64.1 },
        { nutrientNumber: "269", value: 3.12 },
      ],
    },
  ],
};

// search() fetches the whole-food datasets first, then Branded — mock in order.
const mockSearch = (whole: unknown, branded: unknown) =>
  mockFetch.mockResolvedValueOnce(ok(whole)).mockResolvedValueOnce(ok(branded));

beforeEach(() => {
  process.env.USDA_API_KEY = "test-key";
  mockFetch.mockReset();
});

describe("UsdaProvider.isConfigured", () => {
  it("is true when the API key is set", () => {
    expect(usda.isConfigured()).toBe(true);
  });

  it("is false when the API key is missing", () => {
    delete process.env.USDA_API_KEY;
    expect(usda.isConfigured()).toBe(false);
  });
});

describe("UsdaProvider.search", () => {
  it("throws ProviderUnavailableError when not configured", async () => {
    delete process.env.USDA_API_KEY;
    await expect(usda.search("apple")).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
  });

  it("normalizes a USDA search result", async () => {
    mockSearch(appleSearch, { foods: [] });

    const results = await usda.search("apple");
    expect(results).toHaveLength(1);
    const r = results[0];

    expect(r.source).toBe("usda");
    expect(r.external_id).toBe("1102644");
    expect(r.name).toBe("Apples, raw, with skin");
    // per-100g preserved straight from foodNutrients
    expect(r.per_100g?.calories).toBe(52);
    // default serving = first portion (1 large, 223g) → 52 * 2.23 ≈ 116
    // label carries the gram weight so the option is self-explanatory
    expect(r.default_serving_label).toBe("1 large (223 g)");
    expect(r.default_serving_grams).toBe(223);
    expect(r.per_serving.calories).toBe(116);
    // a synthetic "100 g" option is always appended
    expect(r.available_servings?.some((s) => s.unit === "g")).toBe(true);
    expect(r.available_servings?.some((s) => s.unit === "large")).toBe(true);
  });

  it("falls back to Atwater energy (957/958) when 208 is absent", async () => {
    // Foundation foods (e.g. Fuji apple) report energy only as Atwater factors.
    mockSearch(
      {
        foods: [
          {
            fdcId: 1750340,
            description: "Apples, fuji, with skin, raw",
            foodNutrients: [
              { nutrientNumber: "957", value: 64.7 }, // Atwater general
              { nutrientNumber: "958", value: 58.2 }, // Atwater specific
              { nutrientNumber: "203", value: 0.15 },
            ],
          },
        ],
      },
      { foods: [] },
    );
    const [r] = await usda.search("fuji apple");
    // prefers the general factor (957) over the specific (958)
    expect(r.per_100g?.calories).toBe(64.7);
    expect(r.per_serving.calories).not.toBeNull();
  });

  it("throws ProviderUnavailableError when both datasets fail", async () => {
    // Both the whole-food and branded fetches return non-OK.
    mockFetch.mockResolvedValue({ ok: false, status: 429 });
    await expect(usda.search("apple")).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
  });

  it("queries both the whole-food and branded datasets", async () => {
    mockSearch({ foods: [] }, { foods: [] });
    await usda.search("apple");
    const urls = mockFetch.mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes("Foundation"))).toBe(true);
    expect(urls.some((u) => u.includes("Branded"))).toBe(true);
  });

  it("normalizes a branded item via per-100g nutrients and a label serving", async () => {
    mockSearch({ foods: [] }, cupNoodlesBranded);

    const results = await usda.search("cup noodles");
    expect(results).toHaveLength(1);
    const r = results[0];

    expect(r.external_id).toBe("2000001");
    expect(r.name).toBe("CUP NOODLES, BEEF");
    expect(r.brand).toBe("Nissin");
    // branded foodNutrients are per-100g, same as whole foods
    expect(r.per_100g?.calories).toBe(453);
    // default serving is synthesised from the label: "1 CONTAINER (64 g)"
    expect(r.default_serving_label).toBe("1 CONTAINER (64 g)");
    expect(r.default_serving_grams).toBe(64);
    // 453 * 0.64 ≈ 290 kcal per container — matches the printed label
    expect(r.per_serving.calories).toBe(290);
    expect(
      r.available_servings?.some((s) => s.label === "1 CONTAINER (64 g)"),
    ).toBe(true);
  });

  it("merges whole foods ahead of branded results", async () => {
    mockSearch(appleSearch, cupNoodlesBranded);
    const results = await usda.search("anything");
    expect(results.map((r) => r.name)).toEqual([
      "Apples, raw, with skin", // whole food first
      "CUP NOODLES, BEEF", // branded after
    ]);
  });

  it("dedupes near-duplicate branded products by brand + name", async () => {
    // Same product under three UPCs — should collapse to one.
    mockSearch(
      { foods: [] },
      {
        foods: [1, 2, 3].map((n) => ({
          fdcId: 3000000 + n,
          dataType: "Branded",
          description: "CHEDDAR CHEESE",
          brandName: "WEIS",
          servingSize: 28,
          servingSizeUnit: "g",
          householdServingFullText: "1 oz",
          foodNutrients: [{ nutrientNumber: "208", value: 400 }],
        })),
      },
    );
    const results = await usda.search("cheddar");
    expect(results).toHaveLength(1);
    expect(results[0].brand).toBe("WEIS");
  });

  it("still returns whole foods when the branded query fails", async () => {
    // Whole-food fetch OK, branded fetch errors — resilient via allSettled.
    mockFetch
      .mockResolvedValueOnce(ok(appleSearch))
      .mockResolvedValueOnce({ ok: false, status: 500 });
    const results = await usda.search("apple");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Apples, raw, with skin");
  });
});

// The detail endpoint (/food/{fdcId}) is the only place foodPortions appear;
// getServings pulls them so the modal can show real serving sizes.
const appleDetail = {
  fdcId: 1102644,
  description: "Apples, raw, with skin",
  foodPortions: [
    { amount: 1, modifier: "cup slices", gramWeight: 109 },
    { amount: 1, modifier: "medium (3\" dia)", gramWeight: 182 },
    // Foundation foods label the portion under portionDescription instead.
    { amount: 1, portionDescription: "NLEA serving", gramWeight: 242 },
    // No gramWeight → skipped.
    { amount: 1, modifier: "unweighed", gramWeight: undefined },
  ],
};

describe("UsdaProvider.getServings", () => {
  it("throws ProviderUnavailableError when not configured", async () => {
    delete process.env.USDA_API_KEY;
    await expect(usda.getServings("1102644")).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
  });

  it("maps foodPortions to serving options and appends 100 g", async () => {
    mockFetch.mockResolvedValueOnce(ok(appleDetail));

    const servings = await usda.getServings("1102644");

    // three valid portions (the gramWeight-less one is dropped) + the 100 g tail
    expect(servings).toHaveLength(4);
    expect(servings).toEqual(
      expect.arrayContaining([
        // labels carry the gram weight; the bare "100 g" tail doesn't double it
        { label: "1 cup slices (109 g)", grams: 109, qty: 1, unit: "cup slices" },
        {
          label: '1 medium (3" dia) (182 g)',
          grams: 182,
          qty: 1,
          unit: 'medium (3" dia)',
        },
        // portionDescription used as the unit when modifier is absent
        {
          label: "1 NLEA serving (242 g)",
          grams: 242,
          qty: 1,
          unit: "NLEA serving",
        },
        { label: "100 g", grams: 100, qty: 100, unit: "g" },
      ]),
    );
  });

  it("relabels a bare RACC measure unit as a plain serving", async () => {
    // Foundation foods often expose a single "RACC" portion (FDA reference
    // amount). Surface it as "1 serving (140 g)", not "1 RACC".
    mockFetch.mockResolvedValueOnce(
      ok({
        fdcId: 1750340,
        description: "Apples, fuji, with skin, raw",
        foodPortions: [
          { amount: 1, gramWeight: 140, measureUnit: { name: "RACC" } },
        ],
      }),
    );
    const servings = await usda.getServings("1750340");
    expect(servings).toContainEqual({
      label: "1 serving (140 g)",
      grams: 140,
      qty: 1,
      unit: "serving",
    });
    expect(servings.every((s) => s.unit !== "RACC")).toBe(true);
  });

  it("hits the detail endpoint for the given fdcId", async () => {
    mockFetch.mockResolvedValueOnce(ok(appleDetail));
    await usda.getServings("1102644");
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/food/1102644");
    expect(calledUrl).toContain("api_key=test-key");
  });

  it("throws ProviderUnavailableError on a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(usda.getServings("1102644")).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
  });

  it("prefers portionDescription when modifier is a numeric measure code", async () => {
    // Survey (FNDDS) shape: modifier is a code, real label is portionDescription.
    mockFetch.mockResolvedValueOnce(
      ok({
        fdcId: 2,
        description: "Carrots, raw",
        foodPortions: [
          { amount: 1, modifier: "10205", portionDescription: "1 cup", gramWeight: 175 },
        ],
      }),
    );
    const servings = await usda.getServings("2");
    expect(servings).toContainEqual({
      label: "1 1 cup (175 g)",
      grams: 175,
      qty: 1,
      unit: "1 cup",
    });
    expect(servings.every((s) => s.unit !== "10205")).toBe(true);
  });

  it("returns just the 100 g fallback when a food has no portions", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ fdcId: 1, description: "Salt", foodPortions: [] }),
    );
    const servings = await usda.getServings("1");
    expect(servings).toEqual([
      { label: "100 g", grams: 100, qty: 100, unit: "g" },
    ]);
  });
});

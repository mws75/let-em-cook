import { parseFoodQuery, matchServing } from "./parseQuery";
import { ServingOption } from "./provider";

describe("parseFoodQuery", () => {
  it("treats a bare food name as qty 1, no unit", () => {
    const p = parseFoodQuery("apple");
    expect(p.qty).toBe(1);
    expect(p.unit).toBeNull();
    expect(p.grams).toBeNull();
    expect(p.foodName).toBe("apple");
  });

  it("parses a leading integer quantity", () => {
    const p = parseFoodQuery("3 bananas");
    expect(p.qty).toBe(3);
    expect(p.foodName).toBe("bananas");
  });

  it("parses a quantity + descriptive size word", () => {
    const p = parseFoodQuery("2 large eggs");
    expect(p.qty).toBe(2);
    expect(p.unit).toBe("large");
    expect(p.grams).toBeNull();
    expect(p.foodName).toBe("eggs");
  });

  it("keeps a unit-like word as the food when nothing follows it", () => {
    // "eggs" must not be swallowed as a unit — there's no food after it.
    const p = parseFoodQuery("2 eggs");
    expect(p.qty).toBe(2);
    expect(p.unit).toBeNull();
    expect(p.foodName).toBe("eggs");
  });

  it("parses an attached weight unit (no space) into grams", () => {
    const p = parseFoodQuery("100g cheddar");
    expect(p.qty).toBe(100);
    expect(p.unit).toBe("g");
    expect(p.grams).toBeCloseTo(100);
    expect(p.foodName).toBe("cheddar");
  });

  it("parses ounces into grams", () => {
    const p = parseFoodQuery("2 oz almonds");
    expect(p.unit).toBe("oz");
    expect(p.grams).toBeCloseTo(56.699, 2);
    expect(p.foodName).toBe("almonds");
  });

  it("parses pounds with an attached unit", () => {
    const p = parseFoodQuery("1lb chicken breast");
    expect(p.qty).toBe(1);
    expect(p.unit).toBe("lb");
    expect(p.grams).toBeCloseTo(453.592, 2);
    expect(p.foodName).toBe("chicken breast");
  });

  it("parses a mixed number and strips 'of'", () => {
    const p = parseFoodQuery("1 1/2 cups of cooked rice");
    expect(p.qty).toBeCloseTo(1.5);
    expect(p.unit).toBe("cups");
    expect(p.foodName).toBe("cooked rice");
  });

  it("parses a simple fraction", () => {
    const p = parseFoodQuery("1/2 cup milk");
    expect(p.qty).toBeCloseTo(0.5);
    expect(p.unit).toBe("cup");
    expect(p.foodName).toBe("milk");
  });

  it("parses a standalone unicode fraction", () => {
    const p = parseFoodQuery("½ cup yogurt");
    expect(p.qty).toBeCloseTo(0.5);
    expect(p.unit).toBe("cup");
    expect(p.foodName).toBe("yogurt");
  });

  it("parses a number with an attached unicode fraction", () => {
    const p = parseFoodQuery("1½ cups oats");
    expect(p.qty).toBeCloseTo(1.5);
    expect(p.unit).toBe("cups");
    expect(p.foodName).toBe("oats");
  });

  it("treats articles as qty 1", () => {
    expect(parseFoodQuery("a banana").qty).toBe(1);
    expect(parseFoodQuery("an orange").foodName).toBe("orange");
  });

  it("normalizes plural abbreviations", () => {
    expect(parseFoodQuery("2 tbsps peanut butter").unit).toBe("tbsp");
    expect(parseFoodQuery("3 tsps sugar").unit).toBe("tsp");
  });

  it("handles 'extra large' as xl", () => {
    const p = parseFoodQuery("1 extra large egg");
    expect(p.unit).toBe("xl");
    expect(p.foodName).toBe("egg");
  });

  it("keeps a leading measurement word as the food when no quantity precedes it", () => {
    // "cup noodles" is the product, not "1 cup of noodles" — don't strip "cup".
    const p = parseFoodQuery("cup noodles");
    expect(p.qty).toBe(1);
    expect(p.unit).toBeNull();
    expect(p.foodName).toBe("cup noodles");
  });

  it("still parses a measurement word as a unit when a quantity precedes it", () => {
    const p = parseFoodQuery("2 cups noodles");
    expect(p.qty).toBe(2);
    expect(p.unit).toBe("cups");
    expect(p.foodName).toBe("noodles");
  });

  it("keeps a size word in the food name without a quantity", () => {
    const p = parseFoodQuery("large egg");
    expect(p.unit).toBeNull();
    expect(p.foodName).toBe("large egg");
  });

  it("returns empty foodName for empty input", () => {
    const p = parseFoodQuery("");
    expect(p.foodName).toBe("");
    expect(p.qty).toBe(1);
  });

  it("never returns a non-finite quantity (divide-by-zero guard)", () => {
    const p = parseFoodQuery("1/0 cup milk");
    expect(Number.isFinite(p.qty)).toBe(true);
    expect(p.qty).toBe(1);
    expect(p.foodName).toBe("milk");
  });

  it("preserves the raw input", () => {
    expect(parseFoodQuery("2 large eggs").raw).toBe("2 large eggs");
  });
});

describe("matchServing", () => {
  const servings: ServingOption[] = [
    { label: "1 large", grams: 223, qty: 1, unit: "large" },
    { label: "1 cup, sliced", grams: 109, qty: 1, unit: "cup, sliced" },
    { label: "100 g", grams: 100, qty: 100, unit: "g" },
  ];

  it("returns undefined when there is no parsed unit", () => {
    const parsed = parseFoodQuery("apple");
    expect(matchServing(parsed, servings)).toBeUndefined();
  });

  it("returns undefined when there are no servings", () => {
    const parsed = parseFoodQuery("1 large apple");
    expect(matchServing(parsed, undefined)).toBeUndefined();
    expect(matchServing(parsed, [])).toBeUndefined();
  });

  it("matches a descriptive size word by label/unit", () => {
    const parsed = parseFoodQuery("1 large apple");
    expect(matchServing(parsed, servings)?.unit).toBe("large");
  });

  it("prefers an exact size word over a broader one", () => {
    const withXL: ServingOption[] = [
      { label: "1 extra large", grams: 250, qty: 1, unit: "extra large" },
      { label: "1 large", grams: 223, qty: 1, unit: "large" },
    ];
    const parsed = parseFoodQuery("1 large apple");
    // must pick "large", not "extra large" (which also contains "large")
    expect(matchServing(parsed, withXL)?.unit).toBe("large");
  });

  it("matches a volume word inside a compound label", () => {
    const parsed = parseFoodQuery("1 cup apple");
    expect(matchServing(parsed, servings)?.label).toBe("1 cup, sliced");
  });

  it("prefers a gram serving for weight units", () => {
    const parsed = parseFoodQuery("100g apple");
    expect(matchServing(parsed, servings)?.unit).toBe("g");
  });

  it("returns undefined when nothing matches", () => {
    const parsed = parseFoodQuery("2 slices apple");
    expect(matchServing(parsed, servings)).toBeUndefined();
  });
});

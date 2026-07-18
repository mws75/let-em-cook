// Lightweight, deterministic natural-language quantity parser.
//
// Turns free text like "2 large eggs", "100g cheddar", "1 1/2 cups cooked rice",
// or just "apple" into { qty, unit, grams, foodName } so we can drive a free
// USDA lookup without a paid natural-language API.
//
// This is intentionally NOT an LLM call: it runs on every search keystroke (must
// be instant and free) and the user can always fine-tune the result in the
// editable macro form afterward. It does two jobs:
//   1. Pull a quantity + unit/size word off the front of the query.
//   2. Leave the rest as the food name to search USDA for.
// Portion → gram conversion for non-weight units is done later by matching the
// parsed unit against the chosen food's USDA `foodPortions` (see matchServing).

import { ServingOption } from "./provider";

export type ParsedFoodQuery = {
  qty: number; // quantity multiplier, default 1
  unit: string | null; // normalized unit/size token, e.g. "large", "cup", "g"
  grams: number | null; // total grams when unit is a weight (qty already applied)
  foodName: string; // the food to search USDA for
  raw: string; // original input, untouched
};

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅛": 0.125,
};
const UNICODE_FRACTION_CLASS = "½⅓⅔¼¾⅕⅖⅗⅘⅙⅛";

// Weight units → grams per 1 unit. When the query carries one of these we can
// scale USDA's per-100g data directly, no portion lookup needed.
const GRAMS_PER_UNIT: Record<string, number> = {
  mg: 0.001,
  g: 1,
  gram: 1,
  grams: 1,
  gm: 1,
  kg: 1000,
  kilo: 1000,
  kilos: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

// Non-weight units / size words we recognise and pass through to USDA portion
// matching. These are only treated as a unit when a food name follows them
// (so "2 eggs" keeps "eggs" as the food, while "2 slices bread" → unit "slices").
const DESCRIPTIVE_UNITS = new Set([
  "small",
  "medium",
  "large",
  "xl",
  "cup",
  "cups",
  "tbsp",
  "tbsps",
  "tablespoon",
  "tablespoons",
  "tsp",
  "tsps",
  "teaspoon",
  "teaspoons",
  "slice",
  "slices",
  "piece",
  "pieces",
  "clove",
  "cloves",
  "can",
  "cans",
  "bottle",
  "bottles",
  "package",
  "packages",
  "pkg",
  "scoop",
  "scoops",
  "serving",
  "servings",
  "stick",
  "sticks",
  "fillet",
  "fillets",
  "handful",
]);

function normalizeUnit(word: string): string {
  const w = word.toLowerCase();
  if (w === "tbsps") return "tbsp";
  if (w === "tsps") return "tsp";
  return w;
}

export function parseFoodQuery(input: string): ParsedFoodQuery {
  const raw = input;
  let s = input.trim();
  if (!s) return { qty: 1, unit: null, grams: null, foodName: "", raw };

  let qty = 1;
  let matchedQty = false;

  // 1. Leading article — "a", "an", "one"
  const article = s.match(/^(?:an?|one)\s+/i);
  if (article) {
    qty = 1;
    matchedQty = true;
    s = s.slice(article[0].length);
  }

  // 2. Mixed number — "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\b/);
  if (!matchedQty && mixed) {
    qty = parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
    matchedQty = true;
    s = s.slice(mixed[0].length);
  }

  // 3. Simple fraction — "1/2"
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)\b/);
  if (!matchedQty && frac) {
    qty = parseInt(frac[1], 10) / parseInt(frac[2], 10);
    matchedQty = true;
    s = s.slice(frac[0].length);
  }

  // 4. Decimal/integer, optionally with an attached unicode fraction — "1½"
  const dec = s.match(/^(\d+(?:\.\d+)?)/);
  if (!matchedQty && dec) {
    qty = parseFloat(dec[1]);
    matchedQty = true;
    s = s.slice(dec[0].length);
    const uf = s.match(new RegExp(`^([${UNICODE_FRACTION_CLASS}])`));
    if (uf) {
      qty += UNICODE_FRACTIONS[uf[1]];
      s = s.slice(uf[0].length);
    }
  }

  // 5. Standalone unicode fraction — "½"
  const uni = s.match(new RegExp(`^([${UNICODE_FRACTION_CLASS}])`));
  if (!matchedQty && uni) {
    qty = UNICODE_FRACTIONS[uni[1]];
    matchedQty = true;
    s = s.slice(uni[0].length);
  }

  s = s.trim();

  // 6. Unit — two-word forms first ("fl oz", "extra large"), then single word.
  // Only parse a unit when an explicit quantity preceded it. Without a number, a
  // leading measurement word is far more likely part of the food's name (the
  // product "Cup Noodles", "Can of ..." brands) than a portion unit — so we keep
  // the whole phrase as the search term. A number is the disambiguating signal:
  // "1 cup noodles" → unit "cup"; "cup noodles" → search "cup noodles".
  let unit: string | null = null;
  let grams: number | null = null;

  if (matchedQty) {
    const two = s.match(/^(fl\s*oz|extra\s+large|fluid\s+ounces?)\b/i);
    if (two) {
      const t = two[1].toLowerCase();
      if (t.startsWith("extra")) {
        unit = "xl";
      } else {
        unit = "oz";
        grams = GRAMS_PER_UNIT.oz * qty;
      }
      s = s.slice(two[0].length).trim();
    } else {
      const one = s.match(/^([a-zA-Z]+)\b/);
      if (one) {
        const w = normalizeUnit(one[1]);
        const remainder = s
          .slice(one[0].length)
          .replace(/^\s+(?:of\s+)?/i, "")
          .trim();
        if (w in GRAMS_PER_UNIT) {
          unit = w;
          grams = GRAMS_PER_UNIT[w] * qty;
          s = remainder;
        } else if (DESCRIPTIVE_UNITS.has(w) && remainder.length > 0) {
          // Only consume as a unit when a food name actually follows it.
          unit = w;
          s = remainder;
        }
      }
    }
  }

  // Strip a dangling "of" ("1 cup of rice" already handled, but "of rice" too).
  s = s.replace(/^of\s+/i, "").trim();

  // Safety net for pathological quantities — e.g. "1/0" → Infinity. Never let a
  // non-finite or non-positive quantity through; fall back to 1.
  if (!Number.isFinite(qty) || qty <= 0) {
    qty = 1;
    grams = grams != null && Number.isFinite(grams) && grams > 0 ? grams : null;
  }

  const foodName = s.length > 0 ? s : raw.trim();

  return { qty, unit, grams, foodName, raw };
}

/**
 * Picks the serving option from a food's USDA portions that best matches the
 * parsed unit/size word. Weight units prefer a gram serving; descriptive units
 * match by label/unit substring. Returns undefined when nothing fits (caller
 * falls back to the food's default serving).
 */
export function matchServing(
  parsed: ParsedFoodQuery,
  servings: ServingOption[] | undefined,
): ServingOption | undefined {
  if (!servings?.length || !parsed.unit) return undefined;

  if (parsed.grams != null) {
    return servings.find((s) => s.unit.toLowerCase() === "g");
  }

  const u = parsed.unit.toLowerCase();
  const word = new RegExp(`\\b${u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);

  // Exact unit first (so "large" prefers the "large" serving over "extra large"),
  // then a whole-word match in the unit/label, then a loose substring fallback.
  return (
    servings.find((s) => s.unit.toLowerCase() === u) ??
    servings.find(
      (s) => word.test(s.unit.toLowerCase()) || word.test(s.label.toLowerCase()),
    ) ??
    servings.find(
      (s) =>
        s.unit.toLowerCase().includes(u) || s.label.toLowerCase().includes(u),
    )
  );
}

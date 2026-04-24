import { Ingredients, GroceryItem, UnitType } from "@/types/types";
import {
  getUnitType,
  convertToBaseUnit,
  convertFromBaseUnit,
  chooseDisplayUnit,
  normalizeUnit,
} from "./unitConverter";

// Common preparation adjectives that should not affect grouping.
// Stripped from both the grouping key and the display name.
const PREP_ADJECTIVES = [
  // multi-word phrases (matched first, via longest-first sort in stripPrepAdjectives)
  "at room temperature",
  "room temperature",
  "lightly beaten",
  "lightly packed",
  "firmly packed",
  "loosely packed",
  "well drained",
  "well-drained",
  "coarsely chopped",
  "finely chopped",
  "roughly chopped",
  "finely diced",
  "roughly diced",
  "large diced",
  "medium diced",
  "small diced",
  "finely grated",
  "thinly sliced",
  "thickly sliced",
  "freshly ground",
  // single-word prep verbs
  "blanched",
  "boiled",
  "beaten",
  "caramelized",
  "chilled",
  "chopped",
  "cooked",
  "cored",
  "crushed",
  "cubed",
  "deboned",
  "dehydrated",
  "deveined",
  "diced",
  "drained",
  "fresh",
  "frozen",
  "grated",
  "ground",
  "halved",
  "hulled",
  "julienned",
  "mashed",
  "melted",
  "minced",
  "peeled",
  "pitted",
  "pounded",
  "pureed",
  "quartered",
  "raw",
  "rinsed",
  "roasted",
  "sauteed",
  "sautéed",
  "seeded",
  "shelled",
  "shredded",
  "skinned",
  "sliced",
  "smoked",
  "softened",
  "steamed",
  "stemmed",
  "toasted",
  "trimmed",
  "warmed",
  "washed",
  "whipped",
  "whisked",
  "zested",
  // bare adverbs that show up alone when the paired verb is elsewhere
  "coarsely",
  "finely",
  "firmly",
  "freshly",
  "lightly",
  "loosely",
  "roughly",
  "thickly",
  "thinly",
];

// Curated typo / spelling-variant map. Keys and values are lowercase.
// Tokens are substituted individually inside a space-separated name.
const TYPO_MAP: Record<string, string> = {
  // existing
  miron: "mirin",
  edame: "edamame",
  romain: "romaine",
  montery: "monterey",
  chilli: "chili",
  chile: "chili",
  tomatos: "tomatoes",
  // produce
  avacado: "avocado",
  brocolli: "broccoli",
  broccolli: "broccoli",
  cauliflour: "cauliflower",
  cilentro: "cilantro",
  letuce: "lettuce",
  oregeno: "oregano",
  zuchini: "zucchini",
  zuchinni: "zucchini",
  zuccini: "zucchini",
  jalepeno: "jalapeno",
  jalapeño: "jalapeno",
  habenero: "habanero",
  tumeric: "turmeric",
  // dairy / cheese
  parmesean: "parmesan",
  parmasan: "parmesan",
  parmigano: "parmigiano",
  mozzerella: "mozzarella",
  mozarella: "mozzarella",
  yoghurt: "yogurt",
  mayonaise: "mayonnaise",
  mayonaisse: "mayonnaise",
  // meats / cured
  panchetta: "pancetta",
  procuitto: "prosciutto",
  prosciuto: "prosciutto",
  // pantry / sauces
  sirracha: "sriracha",
  siracha: "sriracha",
  sriacha: "sriracha",
  worchestershire: "worcestershire",
  worchester: "worcestershire",
  vinagrette: "vinaigrette",
  vingar: "vinegar",
  // grains / baked
  rissotto: "risotto",
  risoto: "risotto",
  bruscetta: "bruschetta",
  expresso: "espresso",
  cinammon: "cinnamon",
  cinamon: "cinnamon",
  // other common
  pepperocini: "pepperoncini",
  ceaser: "caesar",
  ceasar: "caesar",
  gochjang: "gochujang",
  gochujiang: "gochujang",
};

function stripAfterComma(name: string): string {
  const idx = name.indexOf(",");
  return idx >= 0 ? name.slice(0, idx) : name;
}

function stripPrepAdjectives(name: string): string {
  let result = name;
  // Sort longest first so "thinly sliced" matches before "sliced".
  const adjectives = [...PREP_ADJECTIVES].sort((a, b) => b.length - a.length);
  for (const adj of adjectives) {
    const pattern = new RegExp(`\\b${adj}\\b`, "gi");
    result = result.replace(pattern, " ");
  }
  return result;
}

function singularizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ves")) return word.slice(0, -3) + "f";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("ss") || word.endsWith("us") || word.endsWith("is"))
    return word;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function applyTypoMap(name: string): string {
  return name
    .split(/\s+/)
    .map((token) => TYPO_MAP[token] ?? token)
    .join(" ");
}

function cleanName(raw: string): string {
  let result = raw.toLowerCase().trim();
  result = stripAfterComma(result);
  result = applyTypoMap(result);
  result = stripPrepAdjectives(result);
  // Remove punctuation that splits otherwise-equal names ("bok-choy" vs "bok choy")
  result = result.replace(/[-_/]/g, " ");
  result = result.replace(/['’`"]/g, "");
  // Collapse whitespace
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

function normalizeIngredientName(name: string): string {
  const cleaned = cleanName(name);
  // Singularize each token; safe for most ingredient words.
  return cleaned
    .split(" ")
    .map(singularizeWord)
    .join(" ")
    .trim();
}

function titleCase(str: string): string {
  return str
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function buildDisplayName(originals: string[]): string {
  // Prefer a cleaned version of the first original that has a capitalized first letter.
  for (const original of originals) {
    if (original && original[0] === original[0].toUpperCase()) {
      const cleaned = cleanName(original);
      if (cleaned) return titleCase(cleaned);
    }
  }
  // Fall back to title-casing a cleaned form of the first original.
  const fallback = cleanName(originals[0] || "");
  return titleCase(fallback);
}

export function aggregateIngredients(ingredients: Ingredients[]): GroceryItem[] {
  // Step 1: Group by normalized name
  const groupedByName = new Map<string, Ingredients[]>();

  for (const ingredient of ingredients) {
    const normalizedName = normalizeIngredientName(ingredient.name);
    if (!normalizedName) continue;
    const existing = groupedByName.get(normalizedName) || [];
    existing.push(ingredient);
    groupedByName.set(normalizedName, existing);
  }

  const results: GroceryItem[] = [];

  // Step 2: For each name group, sub-group by unit type and aggregate
  for (const [normalizedName, items] of groupedByName) {
    const displayName = buildDisplayName(items.map((i) => i.name));

    // Sub-group by unit type
    const byUnitType = new Map<UnitType, Ingredients[]>();
    for (const item of items) {
      const unitType = getUnitType(item.unit);
      const existing = byUnitType.get(unitType) || [];
      existing.push(item);
      byUnitType.set(unitType, existing);
    }

    // Aggregate each unit type subgroup
    for (const [unitType, subItems] of byUnitType) {
      if (unitType === "other") {
        // Sub-group by normalized unit string so "pinch"+"pinch" can combine
        // while "pinch"+"dash" stay separate. Missing/blank units collapse
        // into a single "to taste" entry.
        const byUnit = new Map<string, Ingredients[]>();
        for (const item of subItems) {
          const u = normalizeUnit(item.unit);
          const bucket = byUnit.get(u) || [];
          bucket.push(item);
          byUnit.set(u, bucket);
        }

        for (const [unit, bucket] of byUnit) {
          const totalQty = bucket.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0,
          );
          const hasQty = totalQty > 0 && unit !== "";
          results.push({
            name: normalizedName,
            displayName,
            quantity: hasQty ? totalQty : 0,
            unit: hasQty ? unit : "to taste",
            unitType,
          });
        }
        continue;
      }

      if (unitType === "count") {
        // Count units: sum quantities, use most common unit (post-synonym)
        const totalQty = subItems.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0,
        );
        const displayUnit = chooseDisplayUnit(subItems.map((i) => i.unit));

        results.push({
          name: normalizedName,
          displayName,
          quantity: totalQty,
          unit: displayUnit,
          unitType,
        });
        continue;
      }

      // Volume or Weight: convert to base unit, sum, convert back
      let totalBase = 0;
      const units: string[] = [];

      for (const item of subItems) {
        const converted = convertToBaseUnit(item.quantity || 0, item.unit);
        if (converted) {
          totalBase += converted.value;
          units.push(item.unit);
        }
      }

      const displayUnit = chooseDisplayUnit(units);
      const finalQty = convertFromBaseUnit(totalBase, displayUnit);

      if (finalQty !== null) {
        results.push({
          name: normalizedName,
          displayName,
          quantity: finalQty,
          unit: displayUnit,
          unitType,
        });
      }
    }
  }

  return results;
}

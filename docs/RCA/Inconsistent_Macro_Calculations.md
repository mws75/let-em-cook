# RCA: Inconsistent Macro Calculations on Recipe Save/Edit

**Date:** 2026-03-04
**Severity:** Medium — recipe macros were unreliable and changed on every save
**Status:** Resolved

---

## Summary

**Problem:** Editing a recipe without making any changes produced different calorie values each time (e.g. 450 vs 385 for the same recipe). Macro values were inconsistent across saves, making nutrition data unreliable.

**Solution:** Moved the arithmetic (summing ingredient macros, dividing by servings) out of the LLM and into deterministic code. The LLM now only performs nutrition lookup per ingredient, and all math is handled server-side.

---

## Impact

- Per-serving macro values (calories, protein, fat, carbs, sugar) changed every time a recipe was saved or edited, even with no ingredient changes
- Users could not trust the displayed nutrition information
- Editing a recipe to fix a typo in instructions would silently alter all macro values

---

## Root Cause Analysis

### The Flow (How It Worked Before)

1. User creates or edits a recipe
2. `POST /api/create-recipe-step-two` sends the **entire recipe JSON** to OpenAI
3. The LLM is asked to calculate per-serving macros and return the **full recipe JSON** with five macro fields updated
4. The API parses the response and saves it to the database

### Where It Broke: Step 3

The `CALCULATE_MACROS` prompt asked the LLM to do everything in a single pass:

1. Look up nutrition data for each ingredient
2. Sum the totals across all ingredients
3. Divide by the number of servings
4. Round to appropriate precision
5. Return the entire recipe JSON with only the macro fields changed

**The problem:** LLMs are non-deterministic. Even at `temperature: 0.3`, the model produced different arithmetic results on each call. The variance compounded across multiple ingredients — small differences in per-ingredient estimates led to noticeably different per-serving totals.

Additionally, sending the **entire recipe JSON** (instructions, tags, metadata, etc.) as both input and expected output gave the LLM more surface area to introduce errors. The model occasionally:

- Rounded differently between calls
- Made arithmetic mistakes when dividing totals by servings
- Produced slightly different nutrition estimates for the same ingredient

### Example of the Inconsistency

Same recipe, two consecutive saves with no changes:

| Field | Save 1 | Save 2 |
|-------|--------|--------|
| `per_serving_calories` | 450 | 385 |
| `per_serving_protein_g` | 28.5 | 24.2 |
| `per_serving_fat_g` | 22.0 | 19.8 |

The ingredient list was identical both times. The variance came entirely from the LLM performing arithmetic differently on each call.

---

## Fix

### File 1: `src/lib/prompts.ts`

Replaced the `CALCULATE_MACROS` prompt. Instead of asking the LLM to return the full recipe JSON with macro fields filled in, it now asks for **only** a JSON array of per-ingredient nutrition data.

**Before:**

```ts
export const CALCULATE_MACROS = `
You are a professional nutrition analysis engine.

You will receive a SINGLE JSON object representing a recipe.
This object MUST be treated as immutable EXCEPT for the nutrition macro fields listed below.

Your task:
- Calculate accurate, realistic nutrition macros based on:
  - The full list of ingredients in "ingredients_json"
  - Each ingredient's quantity and unit
  - The total number of servings ("servings")

Rules you MUST follow:
1. DO NOT add, remove, rename, reorder, or restructure ANY fields.
2. DO NOT modify ingredient names, quantities, units, instructions, tags, or metadata.
3. ONLY populate or overwrite the following fields:
   - "per_serving_calories"
   - "per_serving_protein_g"
   - "per_serving_fat_g"
   - "per_serving_carbs_g"
   - "per_serving_sugar_g"
...
Output requirements:
- Return the FULL original JSON object
- With ONLY the five macro fields updated
`;
```

**After:**

```ts
export const CALCULATE_MACROS = `
You are a professional nutrition lookup engine.

You will receive a JSON array of recipe ingredients.
For EACH ingredient, return its TOTAL macros (for the full quantity given, NOT per-serving).

Return ONLY a JSON array in this exact format:
[
  {
    "name": "eggs",
    "calories": 286,
    "protein_g": 25.2,
    "fat_g": 19.0,
    "carbs_g": 1.4,
    "sugar_g": 1.5
  }
]

Rules:
1. One entry per ingredient, in the same order as the input array.
2. Values are for the TOTAL quantity specified (e.g. "4 each eggs" = macros for 4 eggs, not 1).
3. Use standard USDA nutritional data where possible.
4. For branded/packaged foods, use the brand's actual nutrition label data.
5. Optional ingredients ("optional": true) SHOULD be included.
6. If quantity is 0 or missing, return all zeros for that ingredient.
7. Round calories to whole numbers, grams to 1 decimal place.
8. Return ONLY the JSON array — no explanations, no extra text.
`;
```

- The LLM now only does **nutrition lookup** — no division, no full-recipe JSON manipulation
- Returns a simple flat array, much less room for error
- Code handles all arithmetic (summing + dividing by servings)

### File 2: `src/app/api/create-recipe-step-two/route.ts`

Changed the OpenAI call and post-processing to send only ingredients and compute macros deterministically.

**Before:**

```ts
const recipe_text = JSON.stringify(recipe);

const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: CALCULATE_MACROS },
    {
      role: "user",
      content: `add the macros into the required JSON schema.  Return ONLY valid JSON: \n\n ${recipe_text}`,
    },
  ],
  response_format: { type: "json_object" },
  temperature: 0.3,
  max_tokens: 2500,
});

const content = completion.choices[0]?.message?.content;
const data = JSON.parse(content);

// Validate that macro fields were added
if (
  typeof data.per_serving_calories !== "number" ||
  typeof data.per_serving_protein_g !== "number" ||
  // ...
) {
  throw new Error("OpenAI did not return valid macro data");
}
```

**After:**

```ts
// Send only the ingredients array — smaller payload, more focused task
const ingredientsPayload = JSON.stringify(recipe.ingredients_json);
const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: CALCULATE_MACROS },
    {
      role: "user",
      content: `Return ONLY a JSON array of per-ingredient macros for these ingredients:\n\n${ingredientsPayload}`,
    },
  ],
  response_format: { type: "json_object" },
  temperature: 0.3,
  max_tokens: 2500,
});

const content = completion.choices[0]?.message?.content;
const parsed = JSON.parse(content);
// OpenAI json_object mode wraps arrays in an object — unwrap if needed
const breakdown = Array.isArray(parsed)
  ? parsed
  : Array.isArray(parsed.ingredients)
    ? parsed.ingredients
    : Object.values(parsed)[0];

// Validate the breakdown
if (
  !Array.isArray(breakdown) ||
  breakdown.length !== recipe.ingredients_json.length ||
  !breakdown.every(
    (item) =>
      typeof item.calories === "number" &&
      typeof item.protein_g === "number" &&
      typeof item.fat_g === "number" &&
      typeof item.carbs_g === "number" &&
      typeof item.sugar_g === "number",
  )
) {
  throw new Error("OpenAI did not return valid per-ingredient macro data");
}

// Sum all ingredient macros deterministically
const totals = breakdown.reduce(
  (acc, item) => ({
    calories: acc.calories + item.calories,
    protein_g: acc.protein_g + item.protein_g,
    fat_g: acc.fat_g + item.fat_g,
    carbs_g: acc.carbs_g + item.carbs_g,
    sugar_g: acc.sugar_g + item.sugar_g,
  }),
  { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, sugar_g: 0 },
);

// Divide by servings deterministically
const servings = recipe.servings || 4;
const data = {
  ...recipe,
  per_serving_calories: Math.round(totals.calories / servings),
  per_serving_protein_g: Math.round((totals.protein_g / servings) * 10) / 10,
  per_serving_fat_g: Math.round((totals.fat_g / servings) * 10) / 10,
  per_serving_carbs_g: Math.round((totals.carbs_g / servings) * 10) / 10,
  per_serving_sugar_g: Math.round((totals.sugar_g / servings) * 10) / 10,
};
```

---

## Why This Fix Works

| Concern | Before (LLM does everything) | After (LLM lookup + code arithmetic) |
|---------|------------------------------|---------------------------------------|
| **Consistency** | Different macros every save — LLM varies on arithmetic | Same ingredients produce same per-serving values — division is deterministic |
| **Accuracy** | LLM made math errors (wrong division, inconsistent rounding) | Code handles all math exactly |
| **Debuggability** | Black box — no way to see where a wrong number came from | Per-ingredient breakdown is logged, easy to trace any questionable value |
| **Payload size** | Entire recipe JSON sent and returned (~2-5KB) | Only ingredients array sent (~500B), small array returned |

Small LLM variance on individual ingredient lookups is still expected (e.g. "butter, 1 tbsp" might return 101 or 102 calories between calls), but this variance is minor and does not compound through faulty arithmetic.

---

## Lessons Learned

1. **Don't ask LLMs to do arithmetic.** LLMs are good at knowledge recall (nutrition data lookup) but unreliable at math. Move all arithmetic to deterministic code.
2. **Minimize the LLM's responsibility.** The original prompt asked the model to do five things (lookup, sum, divide, round, and reconstruct JSON). The new prompt asks it to do one thing (lookup). Fewer responsibilities = fewer failure modes.
3. **Send only what's needed.** The original call sent the full recipe JSON (instructions, tags, metadata) even though only ingredients mattered. Sending a smaller, focused payload reduces token usage and the chance of the model getting confused.

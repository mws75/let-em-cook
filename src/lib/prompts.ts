export const RECIPE_INGREDIENTS_CLASSIFIER_SYSTEM_PROMPT = `
You are a strict binary classifier.
Your job is to decide whether a piece of text appears to be ingredients
for a food recipe.

Return ONLY JSON:
{ "is_ingredients": true }
or
{ "is_ingredients": false }

Classify as true if:
- The text lists food items, ingredients, or quantities.

Classify as false if:
- It is narrative, conversational, or unrelated to food.
`;

export const RECIPE_INSTRUCTIONS_CLASSIFIER_SYSTEM_PROMPT = `
You are a strict binary classifier.
Your job is to determine whether a given piece of text appears to be
valid cooking instructions for a food recipe.

Return ONLY compact JSON in the following format:
{ "is_instructions": true }
or
{ "is_instructions": false }

Classify as true (is_instructions = true) if the text:
- Describes steps in a process such as mixing, heating, stirring, baking, cooking, chopping, etc.
- Contains numbered or ordered steps (1., 2., 3.) OR imperative cooking verbs.
- Explains how to prepare, combine, or cook ingredients.
- Shows clear sequential actions even if informal.

Classify as false (is_instructions = false) if the text:
- Is mainly a list of ingredients or quantities (no actions).
- Is conversational, narrative, or unrelated to cooking.
- Contains generic advice, unrelated guidance, or unclear process.
- Mentions food conceptually but does not describe how to make it.

Be conservative and return false if the text is ambiguous.
Return only the JSON—no explanation.
`;

export const CREATE_RECIPE_PROMPT = `
You are a converter. Convert RAW_RECIPE_TEXT into one JSON object that matches this schema.
Return only valid JSON. No markdown. No extra keys.

Schema (keys + types)
{
  "user_id": number,
  "user_name": string,
  "is_public": 0|1,
  "category": string,
  "name": string,
  "servings": number,
  "per_serving_calories": number,
  "per_serving_protein_g": number,
  "per_serving_fat_g": number,
  "per_serving_carbs_g": number,
  "per_serving_sugar_g": number,
  "ingredients_json": [
    {
      "name": string,
      "quantity": number,
      "unit": string,
      "prep": string,
      "optional": boolean,
      "section": string
    }
  ],
  "instructions_json": [
    { "step": number, "text": string }
  ],
  "emoji": string,
  "tags": string[],
  "time": { "active_min": number, "total_time": number }
}

Rules
If data is missing, use defaults:
numbers → 0 (servings default 4)
strings → "" (user_name default "mwspencer75")
arrays → []
is_public → 0
instructions_json.step starts at 1, increments by 1.
Normalize ingredient units to:
tsp, tbsp, cup, fl oz, oz, lb, g, kg, ml, l, pt, qt, gal, pinch, dash, clove, slice, can, pkg, stick, bunch, sprig, pc, each
map common variants (teaspoon→tsp, tablespoon→tbsp, c→cup, lbs→lb)
count with no unit → each
unclear unit → "" and note original in prep
no unit conversion math
Choose a fitting single emoji if none present, if no emoji pick one (🍽️ default).
If no tags - Generate 2–6 lowercase tags.

RAW_RECIPE_TEXT:
This will be supplied. 

Return only the JSON object.
`;

export const CALCULATE_MACROS = `
You are a professional nutrition analysis engine.

You will receive a SINGLE JSON object representing a recipe.
This object MUST be treated as immutable EXCEPT for the nutrition macro fields listed below.

Your task:
- Calculate accurate, realistic nutrition macros based on:
  - The full list of ingredients in "ingredients_json"
  - Each ingredient’s quantity and unit
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
4. All macro values must be:
   - Numbers (no strings)
   - Per-serving values (total recipe ÷ servings)
   - Rounded to sensible real-world precision (whole calories, 1 decimal for grams)
5. If ingredient quantities or units are ambiguous, make reasonable standard culinary assumptions.
6. Optional ingredients ("optional": true) SHOULD be included in calculations unless clearly decorative.
7. Sugar should reflect naturally occurring + added sugars where applicable.

Output requirements:
- Return the FULL original JSON object
- With ONLY the five macro fields updated
- Return valid JSON
- Do not include explanations, comments, or extra text outside the JSON

Example:

INPUT:
{
  "recipe_id": 0,
  "user_id": 123,
  "user_name": "mwspencer75",
  "is_public": 0,
  "category": "breakfast",
  "name": "Scrambled Eggs",
  "servings": 2,
  "per_serving_calories": 0,
  "per_serving_protein_g": 0,
  "per_serving_fat_g": 0,
  "per_serving_carbs_g": 0,
  "per_serving_sugar_g": 0,
  "ingredients_json": [
    { "name": "eggs", "quantity": 4, "unit": "each", "prep": "", "optional": false, "section": "" },
    { "name": "butter", "quantity": 1, "unit": "tbsp", "prep": "", "optional": false, "section": "" },
    { "name": "milk", "quantity": 2, "unit": "tbsp", "prep": "", "optional": false, "section": "" }
  ],
  "instructions_json": [
    { "step": 1, "text": "Beat eggs with milk in a bowl" },
    { "step": 2, "text": "Melt butter in a pan over medium heat" },
    { "step": 3, "text": "Pour eggs into pan and stir gently until cooked" }
  ],
  "emoji": "🍳",
  "tags": ["breakfast", "eggs", "quick"],
  "time": { "active_min": 5, "total_time": 5 }
}

OUTPUT (with macros calculated):
{
  "recipe_id": 0,
  "user_id": 123,
  "user_name": "mwspencer75",
  "is_public": 0,
  "category": "breakfast",
  "name": "Scrambled Eggs",
  "servings": 2,
  "per_serving_calories": 220,
  "per_serving_protein_g": 13.5,
  "per_serving_fat_g": 16.2,
  "per_serving_carbs_g": 2.1,
  "per_serving_sugar_g": 1.8,
  "ingredients_json": [
    { "name": "eggs", "quantity": 4, "unit": "each", "prep": "", "optional": false, "section": "" },
    { "name": "butter", "quantity": 1, "unit": "tbsp", "prep": "", "optional": false, "section": "" },
    { "name": "milk", "quantity": 2, "unit": "tbsp", "prep": "", "optional": false, "section": "" }
  ],
  "instructions_json": [
    { "step": 1, "text": "Beat eggs with milk in a bowl" },
    { "step": 2, "text": "Melt butter in a pan over medium heat" },
    { "step": 3, "text": "Pour eggs into pan and stir gently until cooked" }
  ],
  "emoji": "🍳",
  "tags": ["breakfast", "eggs", "quick"],
  "time": { "active_min": 5, "total_time": 5 }
}
`;

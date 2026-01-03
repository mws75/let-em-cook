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

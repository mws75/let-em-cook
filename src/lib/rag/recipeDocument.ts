import type { Recipe, Ingredients } from "@/types/types";

/**
 * Serializes a Recipe into the Markdown document indexed by the DigitalOcean
 * GenAI knowledge base for the RAG recipe assistant.
 *
 * One recipe = one document = ~one chunk. Each doc is self-contained (title,
 * macros, ingredients, tags, times) so a single retrieved chunk fully answers
 * questions about that recipe. Numeric macros are embedded as plain text so the
 * generation model can read and sum them for macro-target questions.
 *
 * See docs/RAG_Recipe_Assistant_Implementation_Guide.md §4.
 */

/** Spaces object key for a recipe's RAG document. The `{userId}/` folder is the
 * per-user isolation boundary — retrieval filters on this path prefix. */
export function recipeDocumentKey(userId: number, recipeId: number): string {
  return `rag/recipes/${userId}/${recipeId}.md`;
}

function formatIngredient(ing: Ingredients): string {
  const qty =
    typeof ing.quantity === "number" && ing.quantity > 0 ? `${ing.quantity} ` : "";
  const unit = ing.unit ? `${ing.unit} ` : "";
  const prep = ing.prep ? ` (${ing.prep})` : "";
  const optional = ing.optional ? " [optional]" : "";
  return `- ${qty}${unit}${ing.name}${prep}${optional}`.trim();
}

/** Builds the Markdown body for a single recipe's RAG document. Pure. */
export function buildRecipeDocument(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.name}`);
  lines.push("");

  // Metadata block — keep macros and facts as readable text.
  lines.push(`- Recipe ID: ${recipe.recipe_id}`);
  if (recipe.category) lines.push(`- Category: ${recipe.category}`);
  if (recipe.servings) lines.push(`- Servings: ${recipe.servings}`);
  if (recipe.tags && recipe.tags.length > 0) {
    lines.push(`- Tags: ${recipe.tags.join(", ")}`);
  }
  const active = recipe.time?.active_min;
  const total = recipe.time?.total_time;
  if (active || total) {
    const parts: string[] = [];
    if (active) parts.push(`Active time: ${active} min`);
    if (total) parts.push(`Total time: ${total} min`);
    lines.push(`- ${parts.join(" | ")}`);
  }
  lines.push("");

  // Macros per serving.
  lines.push("## Macros (per serving)");
  lines.push(`- Calories: ${recipe.per_serving_calories ?? 0}`);
  lines.push(`- Protein: ${recipe.per_serving_protein_g ?? 0} g`);
  lines.push(`- Fat: ${recipe.per_serving_fat_g ?? 0} g`);
  lines.push(`- Carbs: ${recipe.per_serving_carbs_g ?? 0} g`);
  lines.push(`- Sugar: ${recipe.per_serving_sugar_g ?? 0} g`);
  lines.push("");

  // Ingredients.
  if (recipe.ingredients_json && recipe.ingredients_json.length > 0) {
    lines.push("## Ingredients");
    for (const ing of recipe.ingredients_json) {
      lines.push(formatIngredient(ing));
    }
    lines.push("");
  }

  // Instructions.
  if (recipe.instructions_json && recipe.instructions_json.length > 0) {
    lines.push("## Instructions");
    const steps = [...recipe.instructions_json].sort((a, b) => a.step - b.step);
    for (const step of steps) {
      lines.push(`${step.step}. ${step.text}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

import { NextRequest, NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openai";
import { CALCULATE_MACROS } from "@/lib/prompts";
import { getAuthenticatedUserId, getAuthenticatedUser } from "@/lib/auth";
import { countUserRecipes } from "@/lib/database/users";
import { insertRecipe, updateRecipe } from "@/lib/database/recipes";
import { FREE_TIER_RECIPE_LIMIT } from "@/types/types";

const MAX_JSON_CHARACTERS = 20_000;

export async function POST(request: NextRequest) {
  try {
    console.log("=== create-recipe-step-two API called ===");
    const userId = await getAuthenticatedUserId();
    const { recipe, isEditMode, editingRecipeId } = await request.json();

    // Check recipe limit for free users (only for new recipes, not edits)
    if (!isEditMode) {
      const user = await getAuthenticatedUser();
      const recipeCount = await countUserRecipes(userId);
      if (user && user.plan_tier !== "pro" && recipeCount >= FREE_TIER_RECIPE_LIMIT) {
        console.log("Recipe limit reached for free user:", userId);
        return NextResponse.json(
          { error: "Recipe limit reached. Upgrade to Pro for unlimited recipes." },
          { status: 403 }
        );
      }
    }
    console.log("Received recipe:", recipe?.name || "No name");
    console.log("Edit mode:", isEditMode, "Recipe ID:", editingRecipeId);

    // check input data is good
    if (!recipe || typeof recipe !== "object") {
      console.error("Validation failed: Recipe is not an object");
      return NextResponse.json(
        {
          error: "Object is not a valid Recipe object, please try again",
        },
        { status: 400 },
      );
    }

    if (
      !recipe.name ||
      !Array.isArray(recipe.ingredients_json) ||
      recipe.ingredients_json.length === 0 ||
      !Array.isArray(recipe.instructions_json) ||
      recipe.instructions_json.length === 0
    ) {
      console.error("Validation failed: Missing required fields", {
        hasName: !!recipe.name,
        hasIngredients: Array.isArray(recipe.ingredients_json),
        ingredientsLength: recipe.ingredients_json?.length,
        hasInstructions: Array.isArray(recipe.instructions_json),
        instructionsLength: recipe.instructions_json?.length,
      });
      return NextResponse.json(
        {
          error:
            "Missing required recipe fields (name, ingredients, instructions)",
        },
        { status: 400 },
      );
    }

    const recipe_text = JSON.stringify(recipe);
    if (recipe_text.trim().length > MAX_JSON_CHARACTERS) {
      console.error("Validation failed: Recipe too large", recipe_text.length);
      return NextResponse.json(
        { error: "Object is greater than max number of characters" },
        { status: 400 },
      );
    }

    console.log("Calling OpenAI to calculate macros...");
    // Send only the ingredients array — smaller payload, more focused task
    const ingredientsPayload = JSON.stringify(recipe.ingredients_json);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: CALCULATE_MACROS },
        {
          role: "user",
          content: `Return per-ingredient macros for these ingredients:\n\n${ingredientsPayload}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ingredient_macros",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    calories: { type: "number" },
                    protein_g: { type: "number" },
                    fat_g: { type: "number" },
                    carbs_g: { type: "number" },
                    sugar_g: { type: "number" },
                  },
                  required: ["name", "calories", "protein_g", "fat_g", "carbs_g", "sugar_g"],
                  additionalProperties: false,
                },
              },
            },
            required: ["ingredients"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.3,
      max_tokens: 2500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error("OpenAI returned no content");
      throw new Error(
        "We could not add macros to your recipe, please try again",
      );
    }

    console.log("OpenAI response received, parsing JSON...");
    type IngredientMacro = { name: string; calories: number; protein_g: number; fat_g: number; carbs_g: number; sugar_g: number };
    const parsed: { ingredients: IngredientMacro[] } = JSON.parse(content);
    const breakdown = parsed.ingredients;

    // Validate the breakdown length matches
    if (breakdown.length !== recipe.ingredients_json.length) {
      console.error("OpenAI macro breakdown length mismatch", {
        expected: recipe.ingredients_json.length,
        got: breakdown.length,
      });
      throw new Error("OpenAI did not return valid per-ingredient macro data");
    }

    console.log("Per-ingredient breakdown:", breakdown);

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

    console.log("✅ Macros calculated deterministically", {
      totals,
      servings,
      calories: data.per_serving_calories,
      protein: data.per_serving_protein_g,
    });

    // Ensure user_id is set correctly
    data.user_id = userId;

    // Insert or update recipe in database
    let recipe_id: number;
    if (isEditMode && editingRecipeId) {
      console.log("Updating recipe in database...");
      const result = await updateRecipe(data, editingRecipeId);
      recipe_id = result.recipe_id;
      console.log("✅ Recipe updated successfully with ID:", recipe_id);
    } else {
      console.log("Inserting recipe into database...");
      const result = await insertRecipe(data);
      recipe_id = result.recipe_id;
      console.log("✅ Recipe inserted successfully with ID:", recipe_id);
    }

    return NextResponse.json({ data, recipe_id }, { status: 200 });
  } catch (error) {
    console.error("❌ API Error:", error);
    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

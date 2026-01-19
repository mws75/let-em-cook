import { NextRequest, NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openai";
import { CALCULATE_MACROS } from "@/lib/prompts";
import { insertRecipe } from "@/lib/database/insertRecipe";
import { updateRecipe } from "@/lib/database/updateRecipe";
import { getOrCreateUser } from "@/lib/database/getOrCreateUser";
import { getUserWithPlan } from "@/lib/database/getUserWithPlan";
import { countUserRecipes } from "@/lib/database/countUserRecipes";
import { FREE_TIER_RECIPE_LIMIT } from "@/types/types";

const MAX_JSON_CHARACTERS = 20_000;

export async function POST(request: NextRequest) {
  try {
    console.log("=== create-recipe-step-two API called ===");
    // Get or create database user from Clerk authentication
    const userId = await getOrCreateUser();
    // convert request to json
    const { recipe, isEditMode, editingRecipeId } = await request.json();

    // Check recipe limit for free users (only for new recipes, not edits)
    if (!isEditMode) {
      const user = await getUserWithPlan();
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
    // make open AI request
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
    // check response
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error("OpenAI returned no content");
      throw new Error(
        "We could not add macros to your recipe, please try again",
      );
    }

    console.log("OpenAI response received, parsing JSON...");
    // return response
    const data = JSON.parse(content);

    // Validate that macro fields were added
    if (
      typeof data.per_serving_calories !== "number" ||
      typeof data.per_serving_protein_g !== "number" ||
      typeof data.per_serving_fat_g !== "number" ||
      typeof data.per_serving_carbs_g !== "number" ||
      typeof data.per_serving_sugar_g !== "number"
    ) {
      console.error("OpenAI macro validation failed", {
        calories: typeof data.per_serving_calories,
        protein: typeof data.per_serving_protein_g,
        fat: typeof data.per_serving_fat_g,
        carbs: typeof data.per_serving_carbs_g,
        sugar: typeof data.per_serving_sugar_g,
      });
      throw new Error("OpenAI did not return valid macro data");
    }

    console.log("✅ API added macros successfully", {
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

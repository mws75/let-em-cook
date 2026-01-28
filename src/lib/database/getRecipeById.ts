import { Recipe } from "@/types/types";
import { executeQuery } from "./connection";
import { RowDataPacket } from "mysql2";

/**
 * Fetches a single recipe by ID for a specific user from the database
 * @param userId - The user ID to verify ownership
 * @param recipeId - The recipe ID to fetch
 * @returns Recipe object or null if not found
 */
export async function getRecipeById(
  userId: number,
  recipeId: number,
): Promise<Recipe | null> {
  if (!userId || !recipeId) {
    throw new Error("Missing required parameters: userId and recipeId");
  }

  try {
    const query = `
      SELECT
        r.recipe_id,
        r.user_id,
        u.user_name,
        r.is_public,
        c.category_name as category,
        r.name,
        r.servings,
        r.ingredients_json,
        r.instructions_json,
        r.per_serving_calories,
        r.per_serving_protein_g,
        r.per_serving_fat_g,
        r.per_serving_carbs_g,
        r.per_serving_sugar_g,
        r.emoji,
        r.tags_json as tags,
        r.active_time_min,
        r.total_time_min,
        r.created_on,
        r.modified_on
      FROM ltc_recipes r
      LEFT JOIN ltc_users u ON r.user_id = u.user_id
      LEFT JOIN ltc_categories c ON r.category_id = c.category_id
      WHERE r.recipe_id = ? AND r.user_id = ?
    `;

    const rows = await executeQuery<RowDataPacket[]>(query, [recipeId, userId]);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    const recipe: Recipe = {
      recipe_id: row.recipe_id,
      user_id: row.user_id,
      user_name: row.user_name || "Unknown",
      is_public: row.is_public,
      category: row.category || "Uncategorized",
      name: row.name,
      servings: Number(row.servings),
      per_serving_calories: Number(row.per_serving_calories) || 0,
      per_serving_protein_g: Number(row.per_serving_protein_g) || 0,
      per_serving_fat_g: Number(row.per_serving_fat_g) || 0,
      per_serving_carbs_g: Number(row.per_serving_carbs_g) || 0,
      per_serving_sugar_g: Number(row.per_serving_sugar_g) || 0,
      ingredients_json:
        typeof row.ingredients_json === "string"
          ? JSON.parse(row.ingredients_json)
          : row.ingredients_json,
      instructions_json:
        typeof row.instructions_json === "string"
          ? JSON.parse(row.instructions_json)
          : row.instructions_json,
      emoji: row.emoji || "🍽️",
      tags:
        typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags || [],
      time: {
        active_min: row.active_time_min || 0,
        total_time: row.total_time_min || 0,
      },
    };

    return recipe;
  } catch (error) {
    console.error("Error fetching recipe from database:", error);
    throw new Error("Failed to fetch recipe from database");
  }
}

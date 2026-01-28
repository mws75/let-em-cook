import { Recipe } from "@/types/types";
import { withTransaction } from "./connection";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export async function updateRecipe(
  recipe: Recipe,
  recipeId: number,
): Promise<{ recipe_id: number }> {
  // Validate required fields
  if (!recipe.user_id) {
    throw new Error("missing required field: user_id");
  }
  if (!recipeId) {
    throw new Error("missing required field: recipeId");
  }
  if (!recipe.name || recipe.name.trim() === "") {
    throw new Error("missing required field: name");
  }
  if (
    !Array.isArray(recipe.ingredients_json) ||
    recipe.ingredients_json.length === 0
  ) {
    throw new Error("missing required field: ingredients_json");
  }
  if (
    !Array.isArray(recipe.instructions_json) ||
    recipe.instructions_json.length === 0
  ) {
    throw new Error("missing required field: instructions_json");
  }

  return await withTransaction(async (connection) => {
    // Step 1: Look Up or Create Category
    const categoryName = recipe.category || "Uncategorized";
    let categoryId: number;
    const [categoryRows] = await connection.execute<RowDataPacket[]>(
      "SELECT category_id FROM ltc_categories WHERE user_id = ? AND category_name = ?",
      [recipe.user_id, categoryName],
    );
    if (categoryRows.length > 0) {
      categoryId = categoryRows[0].category_id;
    } else {
      const [insertResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ltc_categories (user_id, category_name, color_hex)
        VALUES
        (?, ?, ?)`,
        [recipe.user_id, categoryName, "#6366f1"],
      );
      categoryId = insertResult.insertId;
    }

    // Step 2: Update the recipe
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE ltc_recipes SET
          category_id = ?,
          name = ?,
          servings = ?,
          ingredients_json = ?,
          instructions_json = ?,
          per_serving_calories = ?,
          per_serving_protein_g = ?,
          per_serving_fat_g = ?,
          per_serving_carbs_g = ?,
          per_serving_sugar_g = ?,
          emoji = ?,
          tags_json = ?,
          active_time_min = ?,
          total_time_min = ?,
          is_public = ?,
          modified_on = NOW()
        WHERE recipe_id = ? AND user_id = ?
      `,
      [
        categoryId,
        recipe.name,
        recipe.servings,
        JSON.stringify(recipe.ingredients_json),
        JSON.stringify(recipe.instructions_json),
        recipe.per_serving_calories ?? null,
        recipe.per_serving_protein_g ?? null,
        recipe.per_serving_fat_g ?? null,
        recipe.per_serving_carbs_g ?? null,
        recipe.per_serving_sugar_g ?? null,
        recipe.emoji ?? null,
        recipe.tags ? JSON.stringify(recipe.tags) : null,
        recipe.time?.active_min ?? null,
        recipe.time?.total_time ?? null,
        recipe.is_public ?? 0,
        recipeId,
        recipe.user_id,
      ],
    );

    if (updateResult.affectedRows === 0) {
      throw new Error("Failed to update recipe - recipe not found or not owned by user");
    }

    return { recipe_id: recipeId };
  });
}

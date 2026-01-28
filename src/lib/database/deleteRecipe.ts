import { executeQuery } from "./connection";
import { ResultSetHeader } from "mysql2";

export async function deleteRecipe(
  userId: number,
  recipeId: number,
): Promise<{ deleted: true }> {
  if (!userId) {
    throw new Error("Missing required parameter: userId");
  }
  if (!recipeId) {
    throw new Error("Missing required parameter: recipeId");
  }

  try {
    const query = `
    DELETE FROM ltc_recipes r 
    WHERE r.user_id = ? 
    AND   r.recipe_id = ?;
    `;

    const result = await executeQuery<ResultSetHeader>(query, [
      userId,
      recipeId,
    ]);

    if (result.affectedRows === 0) {
      throw new Error("No rows deleted");
    }

    return { deleted: true };
  } catch (error) {
    console.error("Error deleting recipe from database: ", error);
    throw new Error("Failed to delete recipe from database");
  }
}

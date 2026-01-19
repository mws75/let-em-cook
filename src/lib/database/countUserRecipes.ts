import { executeQuery } from "./connection";
import { RowDataPacket } from "mysql2";

interface CountRow extends RowDataPacket {
  count: number;
}

/**
 * Counts the total number of recipes for a user
 * @param userId - The database user ID
 * @returns The count of recipes owned by the user
 */
export async function countUserRecipes(userId: number): Promise<number> {
  try {
    console.log("=== countUserRecipes called for user:", userId, "===");

    const result = await executeQuery<CountRow[]>(
      "SELECT COUNT(*) as count FROM ltc_recipes WHERE user_id = ?",
      [userId]
    );

    const count = result[0]?.count ?? 0;
    console.log("User has", count, "recipes");

    return count;
  } catch (error) {
    console.error("Error in countUserRecipes:", error);
    throw error;
  }
}

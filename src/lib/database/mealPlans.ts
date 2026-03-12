import { executeQuery } from "./connection";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface MealPlanRow extends RowDataPacket {
  user_id: number;
  plan_json: string;
  modified_on: Date;
}

export async function getMealPlan(
  userId: number,
): Promise<{ planJson: string; modifiedOn: Date } | null> {
  if (!userId) throw new Error("User Id is required");
  try {
    const rows = await executeQuery<MealPlanRow[]>(
      "SELECT plan_json, modified_on FROM ltc_meal_plans WHERE user_id= ? LIMIT 1;",
      [userId],
    );

    if (rows.length === 0) return null;

    return {
      planJson: rows[0].plan_json,
      modifiedOn: rows[0].modified_on,
    };
  } catch (error) {
    console.error("Error fetching meal plan", error);
    throw new Error("Failed to Load Meal Plan");
  }
}

export async function upsertMealPlan(
  userId: number,
  planJson: string,
): Promise<void> {
  if (!userId) throw new Error("User Id is required");
  if (!planJson) throw new Error("Missing Meal Plan");

  try {
    await executeQuery<ResultSetHeader>(
      `INSERT INTO ltc_meal_plans (user_id, plan_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE plan_json = VALUES(plan_json), modified_on = CURRENT_TIMESTAMP`,
      [userId, planJson],
    );
  } catch (error) {
    console.error("Error updating meal plan", error);
    throw new Error("Failed to update mail plan");
  }
}

export async function deleteMealPlan(userId: number): Promise<void> {
  if (!userId) throw new Error("User Id required");
  try {
    await executeQuery<ResultSetHeader>(
      `DELETE FROM ltc_meal_plans WHERE user_id = ?`,
      [userId],
    );
  } catch (error) {
    console.error("Failed deleting meal plan", error);
    throw new Error("Failed to delete meal plan");
  }
}

import { executeQuery } from "./connection";

// ============================================================================
// Recipe Engagement Tracking
// ============================================================================

/**
 * Increments the click count for a recipe
 * Used when users view a recipe from the Explore page
 */
export async function incrementRecipeClick(recipeId: number): Promise<void> {
  await executeQuery(
    `
    INSERT INTO ltc_recipe_engagement (recipe_id, click_count, last_clicked_on)
    VALUES (?, 1, NOW())
    ON DUPLICATE KEY UPDATE
      click_count = click_count + 1,
      last_clicked_on = NOW()
    `,
    [recipeId],
  );
}

/**
 * Increments the add count for a recipe
 * Used when users add a recipe to their collection
 * Note: This is also called within copyRecipeToUser in recipes.ts
 */
export async function incrementRecipeAdd(recipeId: number): Promise<void> {
  await executeQuery(
    `
    INSERT INTO ltc_recipe_engagement (recipe_id, add_count, last_added_on)
    VALUES (?, 1, NOW())
    ON DUPLICATE KEY UPDATE
      add_count = add_count + 1,
      last_added_on = NOW()
    `,
    [recipeId],
  );
}

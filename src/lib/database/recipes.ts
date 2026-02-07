import { Recipe, ExploreRecipe, ExploreFilters } from "@/types/types";
import { executeQuery, withTransaction } from "./connection";
import { ResultSetHeader, RowDataPacket } from "mysql2";

// ===========================================================================// Row Types
// ===========================================================================

interface RecipeRow extends RowDataPacket {
  recipe_id: number;
  user_id: number;
  user_name: string;
  is_public: number;
  is_created_by_user: number;
  category: string;
  category_name: string;
  name: string;
  servings: number;
  ingredients_json: string;
  instructions_json: string;
  per_serving_calories: number;
  per_serving_protein_g: number;
  per_serving_fat_g: number;
  per_serving_carbs_g: number;
  per_serving_sugar_g: number;
  emoji: string;
  tags: string;
  tags_json: string;
  active_time_min: number;
  total_time_min: number;
  created_on: Date;
  modified_on: Date;
}

interface ExploreRecipeRow extends RowDataPacket {
  recipe_id: number;
  user_id: number;
  user_name: string;
  is_public: number;
  is_created_by_user: number;
  category_name: string;
  name: string;
  servings: number;
  ingredients_json: string;
  instructions_json: string;
  per_serving_calories: number;
  per_serving_protein_g: number;
  per_serving_fat_g: number;
  per_serving_carbs_g: number;
  per_serving_sugar_g: number;
  emoji: string;
  tags_json: string;
  active_time_min: number;
  total_time_min: number;
  created_on: Date;
  creator_name: string;
  creator_profile_pic: string | null;
  click_count: number;
  add_count: number;
}

// ============================================================================
// Helper: Map DB Row to Recipe Type
// ===========================================================================

function mapRowToRecipe(row: RecipeRow): Recipe {
  return {
    recipe_id: row.recipe_id,
    user_id: row.user_id,
    user_name: row.user_name || "Unknown",
    is_public: row.is_public as 0 | 1,
    is_created_by_user: (row.is_created_by_user ?? 1) as 0 | 1,
    category: row.category || row.category_name || "Uncategorized",
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
      typeof (row.tags || row.tags_json) === "string"
        ? JSON.parse(row.tags || row.tags_json || "[]")
        : row.tags || [],
    time: {
      active_min: row.active_time_min || 0,
      total_time: row.total_time_min || 0,
    },
  };
}

// ============================================================================
// Get Recipes
// ============================================================================

/**
 * Fetches all recipes for a specific user from the database
 * @param userId - The user ID to fetch recipes for
 * @returns Array of Recipe objects
 */
export async function getRecipes(userId: number): Promise<Recipe[]> {
  if (!userId) {
    throw new Error("Missing required parameter: userId");
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
      WHERE r.user_id = ?
      ORDER BY r.modified_on DESC
    `;

    const rows = await executeQuery<RecipeRow[]>(query, [userId]);
    return rows.map(mapRowToRecipe);
  } catch (error) {
    console.error("Error fetching recipes from database:", error);
    throw new Error("Failed to fetch recipes from database");
  }
}

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

    const rows = await executeQuery<RecipeRow[]>(query, [recipeId, userId]);

    if (rows.length === 0) {
      return null;
    }

    return mapRowToRecipe(rows[0]);
  } catch (error) {
    console.error("Error fetching recipe from database:", error);
    throw new Error("Failed to fetch recipe from database");
  }
}

/**
 * Fetches public recipes for the Explore page
 * Excludes current user's recipes and recipes they've already added
 */
export async function getExploreRecipes(
  currentUserId: number,
  filters: ExploreFilters,
): Promise<{ recipes: ExploreRecipe[]; hasMore: boolean }> {
  const { search, category, calorieRange, limit, offset } = filters;

  // Build WHERE conditions
  const conditions: string[] = [
    "r.is_public = 1",
    "r.is_created_by_user = 1", // Only show originally created recipes
    "r.user_id != ?", // Exclude current user's recipes
  ];
  const params: (string | number)[] = [currentUserId];

  // Exclude recipes user has already added
  conditions.push(`
    r.recipe_id NOT IN (
      SELECT recipe_id FROM ltc_recipes
      WHERE user_id = ? AND is_created_by_user = 0
    )
  `);
  params.push(currentUserId);

  // Search filter
  if (search) {
    conditions.push("(r.name LIKE ? OR r.ingredients_json LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  // Category filter
  if (category) {
    conditions.push("c.category_name = ?");
    params.push(category);
  }

  // Calorie range filter
  if (calorieRange === "under300") {
    conditions.push("r.per_serving_calories < 300");
  } else if (calorieRange === "300to500") {
    conditions.push(
      "r.per_serving_calories >= 300 AND r.per_serving_calories < 500",
    );
  } else if (calorieRange === "500to750") {
    conditions.push(
      "r.per_serving_calories >= 500 AND r.per_serving_calories < 750",
    );
  } else if (calorieRange === "750to1000") {
    conditions.push(
      "r.per_serving_calories >= 750 AND r.per_serving_calories <= 1000",
    );
  } else if (calorieRange === "over1000") {
    conditions.push("r.per_serving_calories > 1000");
  }

  const whereClause = conditions.join(" AND ");

  const query = `
    SELECT
      r.recipe_id,
      r.user_id,
      u.user_name,
      r.is_public,
      r.is_created_by_user,
      COALESCE(c.category_name, 'Uncategorized') as category_name,
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
      r.tags_json,
      r.active_time_min,
      r.total_time_min,
      r.created_on,
      u.user_name AS creator_name,
      u.profile_pic_url AS creator_profile_pic,
      COALESCE(e.click_count, 0) AS click_count,
      COALESCE(e.add_count, 0) AS add_count
    FROM ltc_recipes r
    LEFT JOIN ltc_users u ON r.user_id = u.user_id
    LEFT JOIN ltc_categories c ON r.category_id = c.category_id
    LEFT JOIN ltc_recipe_engagement e ON r.recipe_id = e.recipe_id
    WHERE ${whereClause}
    ORDER BY COALESCE(e.click_count, 0) DESC, r.created_on DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit + 1, offset ?? 0); // Fetch one extra to check if there's more

  const rows = await executeQuery<ExploreRecipeRow[]>(query, params);

  const hasMore = rows.length > limit;
  const recipes: ExploreRecipe[] = rows.slice(0, limit).map((row) => ({
    recipe_id: row.recipe_id,
    user_id: row.user_id,
    user_name: row.user_name,
    is_public: row.is_public as 0 | 1,
    is_created_by_user: row.is_created_by_user as 0 | 1,
    category: row.category_name,
    name: row.name,
    servings: row.servings,
    ingredients_json: JSON.parse(row.ingredients_json || "[]"),
    instructions_json: JSON.parse(row.instructions_json || "[]"),
    per_serving_calories: row.per_serving_calories,
    per_serving_protein_g: row.per_serving_protein_g,
    per_serving_fat_g: row.per_serving_fat_g,
    per_serving_carbs_g: row.per_serving_carbs_g,
    per_serving_sugar_g: row.per_serving_sugar_g,
    emoji: row.emoji || "🍽️",
    tags: JSON.parse(row.tags_json || "[]"),
    time: {
      active_min: row.active_time_min || 0,
      total_time: row.total_time_min || 0,
    },
    creator_name: row.creator_name,
    creator_profile_pic: row.creator_profile_pic,
    click_count: row.click_count,
    add_count: row.add_count,
  }));

  return { recipes, hasMore };
}

// ============================================================================
// Insert / Update / Delete
// ============================================================================

/**
 * Inserts a new recipe into the database
 */
export async function insertRecipe(
  recipe: Recipe,
): Promise<{ recipe_id: number }> {
  // Validate required fields
  if (!recipe.user_id) {
    throw new Error("missing required field: user_id");
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
        VALUES (?, ?, ?)`,
        [recipe.user_id, categoryName, "#6366f1"],
      );
      categoryId = insertResult.insertId;
    }

    // Step 2: Insert recipe
    const [recipeResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO ltc_recipes (
        user_id,
        category_id,
        name,
        servings,
        ingredients_json,
        instructions_json,
        per_serving_calories,
        per_serving_protein_g,
        per_serving_fat_g,
        per_serving_carbs_g,
        per_serving_sugar_g,
        emoji,
        tags_json,
        active_time_min,
        total_time_min,
        is_public,
        is_created_by_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        recipe.user_id,
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
        1, // is_created_by_user = 1 for user-created recipes
      ],
    );

    const recipeId = recipeResult.insertId;
    if (!recipeId) {
      throw new Error("Failed to insert recipe, no insertId returned");
    }
    return { recipe_id: recipeId };
  });
}

/**
 * Updates an existing recipe
 */
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
        VALUES (?, ?, ?)`,
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
      throw new Error(
        "Failed to update recipe - recipe not found or not owned by user",
      );
    }

    return { recipe_id: recipeId };
  });
}

/**
 * Deletes a recipe
 */
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

/**
 * Copies a public recipe to a user's collection
 * Sets is_created_by_user = 0 to mark it as added (not created)
 */
export async function copyRecipeToUser(
  recipeId: number,
  newUserId: number,
): Promise<{ newRecipeId: number }> {
  return await withTransaction(async (connection) => {
    // 1. Copy the recipe with is_created_by_user = 0
    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
      INSERT INTO ltc_recipes (
        user_id, category_id, name, servings, ingredients_json, instructions_json,
        is_public, is_created_by_user, per_serving_calories, per_serving_protein_g,
        per_serving_fat_g, per_serving_carbs_g, per_serving_sugar_g,
        emoji, tags_json, active_time_min, total_time_min
      )
      SELECT
        ?, category_id, name, servings, ingredients_json, instructions_json,
        0, 0, per_serving_calories, per_serving_protein_g,
        per_serving_fat_g, per_serving_carbs_g, per_serving_sugar_g,
        emoji, tags_json, active_time_min, total_time_min
      FROM ltc_recipes
      WHERE recipe_id = ?
      `,
      [newUserId, recipeId],
    );

    const newRecipeId = insertResult.insertId;

    // 2. Increment the add_count on the original recipe
    await connection.execute(
      `
      INSERT INTO ltc_recipe_engagement (recipe_id, add_count, last_added_on)
      VALUES (?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        add_count = add_count + 1,
        last_added_on = NOW()
      `,
      [recipeId],
    );

    return { newRecipeId };
  });
}

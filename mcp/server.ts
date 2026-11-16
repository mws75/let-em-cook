/**
 * Let 'Em Cook — local MCP server
 *
 * A stdio MCP server that lets Claude read and modify one user's Let 'Em Cook
 * data directly. It reuses the app's query modules in src/lib/database so SQL,
 * JSON-column handling and validation match the web app exactly.
 *
 * Acts as a single user, resolved at startup from .env.local:
 *   LTC_MCP_USER_EMAIL=<email in ltc_users>   (or LTC_MCP_USER_ID=<user_id>)
 *
 * Run:  npx tsx --env-file=.env.local mcp/server.ts   (registered in .mcp.json)
 *
 * NOTE: writes go to whatever database .env.local points at. Never write to
 * stdout from this process — stdout is the MCP transport. Log to stderr only.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RowDataPacket } from "mysql2";
import { randomUUID } from "node:crypto";

// Import specific modules, NOT "@/lib/database" — users.ts pulls in Clerk's
// server SDK, which needs a Next.js request context.
import { executeQuery, getPool } from "@/lib/database/connection";
import {
  getRecipes,
  getRecipeById,
  insertRecipe,
  updateRecipe,
  deleteRecipe,
  toggleRecipeFavorite,
  updateRecipeImage,
  clearRecipeImage,
} from "@/lib/database/recipes";
import {
  uploadRecipeImage,
  deleteObjectByUrl,
  validateImage,
} from "@/lib/storage";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { getUserCategories } from "@/lib/database/categories";
import {
  getMealPlan,
  upsertMealPlan,
  deleteMealPlan,
} from "@/lib/database/mealPlans";
import {
  getDailyLog,
  getDailyLogRange,
  upsertDailyLog,
  deleteDailyLog,
} from "@/lib/database/dailyLogs";
import {
  DAYS,
  MEALS,
  DAILY_SLOTS,
  type DailyLogEntry,
  type MealPlanData,
  type Recipe,
} from "@/types/types";

// ---------------------------------------------------------------------------
// User resolution
// ---------------------------------------------------------------------------

interface UserRow extends RowDataPacket {
  user_id: number;
  user_name: string;
  email: string;
  plan_tier: string;
  goal_calories: number | null;
  goal_protein_g: number | null;
  goal_fat_g: number | null;
  goal_carbs_g: number | null;
}

const USER_COLUMNS = `user_id, user_name, email, plan_tier,
  goal_calories, goal_protein_g, goal_fat_g, goal_carbs_g`;

let cachedUser: UserRow | null = null;

async function currentUser(): Promise<UserRow> {
  if (cachedUser) return cachedUser;
  const email = process.env.LTC_MCP_USER_EMAIL;
  const id = process.env.LTC_MCP_USER_ID;
  let rows: UserRow[];
  if (id) {
    rows = await executeQuery<UserRow[]>(
      `SELECT ${USER_COLUMNS} FROM ltc_users WHERE user_id = ? AND is_deleted = 0 LIMIT 1`,
      [Number(id)],
    );
  } else if (email) {
    rows = await executeQuery<UserRow[]>(
      `SELECT ${USER_COLUMNS} FROM ltc_users WHERE email = ? AND is_deleted = 0 LIMIT 1`,
      [email],
    );
  } else {
    throw new Error(
      "No user configured. Set LTC_MCP_USER_EMAIL (or LTC_MCP_USER_ID) in .env.local.",
    );
  }
  if (rows.length === 0) {
    throw new Error(`No active ltc_users row for ${id ? `id ${id}` : email}`);
  }
  cachedUser = rows[0];
  return cachedUser;
}

async function uid(): Promise<number> {
  return (await currentUser()).user_id;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

/** Wrap a tool handler so thrown errors become MCP error results. */
function safe<A>(fn: (args: A) => Promise<ReturnType<typeof ok>>) {
  return async (args: A) => {
    try {
      return await fn(args);
    } catch (error) {
      console.error("[ltc-mcp]", error);
      return fail(error);
    }
  };
}

function recipeSummary(r: Recipe) {
  return {
    recipe_id: r.recipe_id,
    name: r.name,
    emoji: r.emoji,
    category: r.category,
    servings: r.servings,
    per_serving: {
      calories: r.per_serving_calories,
      protein_g: r.per_serving_protein_g,
      fat_g: r.per_serving_fat_g,
      carbs_g: r.per_serving_carbs_g,
      sugar_g: r.per_serving_sugar_g,
    },
    is_favorite: r.is_favorite,
    is_public: r.is_public,
    is_created_by_user: r.is_created_by_user,
    image_url: r.image_url ?? null,
  };
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function requireRecipe(recipeId: number): Promise<Recipe> {
  const recipe = await getRecipeById(await uid(), recipeId);
  if (!recipe) throw new Error(`Recipe ${recipeId} not found for this user`);
  return recipe;
}

function emptyPlan(): MealPlanData {
  const week = {} as MealPlanData["week"];
  for (const day of DAYS) {
    week[day] = {} as MealPlanData["week"][typeof day];
    for (const meal of MEALS) week[day][meal] = { recipeIds: [] };
  }
  return { week, snacks: { recipeIds: [] } };
}

async function loadPlan(): Promise<MealPlanData> {
  const row = await getMealPlan(await uid());
  if (!row) return emptyPlan();
  const plan = (
    typeof row.planJson === "string" ? JSON.parse(row.planJson) : row.planJson
  ) as MealPlanData;
  // Backfill any missing day/meal slots so writes never hit undefined.
  const base = emptyPlan();
  for (const day of DAYS) {
    for (const meal of MEALS) {
      base.week[day][meal] = plan.week?.[day]?.[meal] ?? base.week[day][meal];
    }
  }
  base.snacks = plan.snacks ?? base.snacks;
  return base;
}

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ingredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  prep: z.string().optional(),
  optional: z.boolean().optional(),
  section: z
    .string()
    .describe("Grocery section, e.g. Produce, Meat, Dairy, Pantry, Spices"),
});

const instructionSchema = z.object({ step: z.number().int(), text: z.string() });

const macroNum = z.number().nonnegative();

const recipeFields = {
  name: z.string().min(1),
  category: z.string().optional().describe("Category name; created if it doesn't exist"),
  servings: z.number().positive(),
  ingredients: z.array(ingredientSchema).min(1),
  instructions: z.array(instructionSchema).min(1),
  per_serving_calories: macroNum,
  per_serving_protein_g: macroNum,
  per_serving_fat_g: macroNum,
  per_serving_carbs_g: macroNum,
  per_serving_sugar_g: macroNum.optional(),
  emoji: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active_min: z.number().int().nonnegative().optional(),
  total_min: z.number().int().nonnegative().optional(),
  is_public: z.boolean().optional().describe("Show on the public Explore feed"),
};

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("YYYY-MM-DD");

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new McpServer({ name: "let-em-cook", version: "0.1.0" });

server.registerTool(
  "whoami",
  {
    description:
      "Show which Let 'Em Cook user this server acts as, their plan tier, macro goals and recipe count.",
    inputSchema: {},
  },
  safe(async () => {
    const u = await currentUser();
    const [{ n }] = await executeQuery<(RowDataPacket & { n: number })[]>(
      "SELECT COUNT(*) AS n FROM ltc_recipes WHERE user_id = ?",
      [u.user_id],
    );
    return ok({
      user_id: u.user_id,
      user_name: u.user_name,
      plan_tier: u.plan_tier,
      recipe_count: Number(n),
      database: process.env.DATABASE_NAME,
      goals: {
        calories: u.goal_calories,
        protein_g: u.goal_protein_g,
        fat_g: u.goal_fat_g,
        carbs_g: u.goal_carbs_g,
      },
    });
  }),
);

// ----- Recipes -------------------------------------------------------------

server.registerTool(
  "list_recipes",
  {
    description:
      "List the user's recipes (summary: id, name, category, per-serving macros, favorite/public flags).",
    inputSchema: {
      search: z.string().optional().describe("Case-insensitive name filter"),
      category: z.string().optional(),
      favorites_only: z.boolean().optional(),
      missing_image: z.boolean().optional().describe("Only recipes with no photo"),
    },
  },
  safe(async ({ search, category, favorites_only, missing_image }) => {
    let recipes = await getRecipes(await uid());
    if (search) {
      const s = search.toLowerCase();
      recipes = recipes.filter((r) => r.name.toLowerCase().includes(s));
    }
    if (category) {
      const c = category.toLowerCase();
      recipes = recipes.filter((r) => r.category.toLowerCase() === c);
    }
    if (favorites_only) recipes = recipes.filter((r) => r.is_favorite === 1);
    if (missing_image) recipes = recipes.filter((r) => !r.image_url);
    return ok({ count: recipes.length, recipes: recipes.map(recipeSummary) });
  }),
);

server.registerTool(
  "get_recipe",
  {
    description: "Get one recipe in full (ingredients, instructions, macros, tags, times).",
    inputSchema: { recipe_id: z.number().int() },
  },
  safe(async ({ recipe_id }) => ok(await requireRecipe(recipe_id))),
);

server.registerTool(
  "create_recipe",
  {
    description:
      "Create a recipe for the user. Macros are per serving and must be supplied (this does not call the app's OpenAI pipeline). Does not enforce the free-tier recipe cap.",
    inputSchema: recipeFields,
  },
  safe(async (a) => {
    const userId = await uid();
    const recipe: Recipe = {
      recipe_id: 0,
      user_id: userId,
      user_name: "",
      is_public: a.is_public ? 1 : 0,
      is_created_by_user: 1,
      is_favorite: 0,
      category: a.category ?? "Uncategorized",
      name: a.name.trim(),
      servings: a.servings,
      per_serving_calories: a.per_serving_calories,
      per_serving_protein_g: a.per_serving_protein_g,
      per_serving_fat_g: a.per_serving_fat_g,
      per_serving_carbs_g: a.per_serving_carbs_g,
      per_serving_sugar_g: a.per_serving_sugar_g ?? 0,
      ingredients_json: a.ingredients,
      instructions_json: a.instructions,
      emoji: a.emoji ?? "🍽️",
      image_url: null,
      tags: a.tags ?? [],
      time: { active_min: a.active_min ?? 0, total_time: a.total_min ?? 0 },
    };
    const { recipe_id } = await insertRecipe(recipe);
    return ok({ created: true, recipe_id, name: recipe.name });
  }),
);

server.registerTool(
  "update_recipe",
  {
    description:
      "Update a recipe. Only the fields you pass change; ingredients/instructions/tags, if passed, replace the whole list.",
    inputSchema: {
      recipe_id: z.number().int(),
      ...Object.fromEntries(
        Object.entries(recipeFields).map(([k, v]) => [k, v.optional()]),
      ),
    } as { recipe_id: z.ZodNumber } & {
      [K in keyof typeof recipeFields]: z.ZodOptional<(typeof recipeFields)[K]>;
    },
  },
  safe(async (a) => {
    const existing = await requireRecipe(a.recipe_id);
    const merged: Recipe = {
      ...existing,
      name: a.name?.trim() ?? existing.name,
      category: a.category ?? existing.category,
      servings: a.servings ?? existing.servings,
      ingredients_json: a.ingredients ?? existing.ingredients_json,
      instructions_json: a.instructions ?? existing.instructions_json,
      per_serving_calories: a.per_serving_calories ?? existing.per_serving_calories,
      per_serving_protein_g: a.per_serving_protein_g ?? existing.per_serving_protein_g,
      per_serving_fat_g: a.per_serving_fat_g ?? existing.per_serving_fat_g,
      per_serving_carbs_g: a.per_serving_carbs_g ?? existing.per_serving_carbs_g,
      per_serving_sugar_g: a.per_serving_sugar_g ?? existing.per_serving_sugar_g,
      emoji: a.emoji ?? existing.emoji,
      tags: a.tags ?? existing.tags,
      time: {
        active_min: a.active_min ?? existing.time.active_min,
        total_time: a.total_min ?? existing.time.total_time,
      },
      is_public:
        a.is_public === undefined ? existing.is_public : a.is_public ? 1 : 0,
    };
    await updateRecipe(merged, a.recipe_id);
    return ok({ updated: true, recipe: recipeSummary(merged) });
  }),
);

server.registerTool(
  "delete_recipe",
  {
    description:
      "Permanently delete one of the user's recipes. Requires confirm: true. Confirm with the user first.",
    inputSchema: {
      recipe_id: z.number().int(),
      confirm: z.literal(true),
    },
  },
  safe(async ({ recipe_id }) => {
    const recipe = await requireRecipe(recipe_id);
    await deleteRecipe(await uid(), recipe_id);
    return ok({ deleted: true, recipe_id, name: recipe.name });
  }),
);

server.registerTool(
  "set_recipe_favorite",
  {
    description: "Mark or unmark a recipe as a favorite.",
    inputSchema: { recipe_id: z.number().int(), is_favorite: z.boolean() },
  },
  safe(async ({ recipe_id, is_favorite }) => {
    const res = await toggleRecipeFavorite(await uid(), recipe_id, is_favorite);
    if (!res) throw new Error(`Recipe ${recipe_id} not found for this user`);
    return ok({ recipe_id, ...res });
  }),
);

server.registerTool(
  "set_recipe_image",
  {
    description:
      "Upload a local photo (JPEG/PNG/WebP, <= 4 MB) to DigitalOcean Spaces and set it as the recipe's image, same as the app's upload button. Replaces (and deletes) any previous photo.",
    inputSchema: {
      recipe_id: z.number().int(),
      file_path: z.string().describe("Absolute path to the image file"),
    },
  },
  safe(async ({ recipe_id, file_path }) => {
    const userId = await uid();
    await requireRecipe(recipe_id);
    const path = resolve(file_path);
    const contentType = CONTENT_TYPES[extname(path).toLowerCase()];
    const buffer = await readFile(path);
    const check = validateImage({ contentType: contentType ?? "", size: buffer.length });
    if (!check.ok) throw new Error(check.error);

    const { url } = await uploadRecipeImage(recipe_id, buffer, contentType);
    const result = await updateRecipeImage(userId, recipe_id, url);
    if (!result) {
      await deleteObjectByUrl(url);
      throw new Error(`Recipe ${recipe_id} not found for this user`);
    }
    if (result.previousUrl && result.previousUrl !== url) {
      await deleteObjectByUrl(result.previousUrl);
    }
    return ok({ recipe_id, image_url: url, replaced: result.previousUrl });
  }),
);

server.registerTool(
  "remove_recipe_image",
  {
    description: "Remove a recipe's photo (falls back to emoji) and delete the Spaces object.",
    inputSchema: { recipe_id: z.number().int() },
  },
  safe(async ({ recipe_id }) => {
    const result = await clearRecipeImage(await uid(), recipe_id);
    if (!result) throw new Error(`Recipe ${recipe_id} not found for this user`);
    await deleteObjectByUrl(result.previousUrl);
    return ok({ recipe_id, removed: result.previousUrl });
  }),
);

server.registerTool(
  "list_categories",
  { description: "List the user's recipe categories and colors.", inputSchema: {} },
  safe(async () => ok(await getUserCategories(await uid()))),
);

// ----- Meal plan (calendar) ------------------------------------------------

server.registerTool(
  "get_meal_plan",
  {
    description:
      "Get the weekly meal plan (calendar). Recipe ids are resolved to names. Quick-log entries are included as-is.",
    inputSchema: {},
  },
  safe(async () => {
    const plan = await loadPlan();
    const names = new Map(
      (await getRecipes(await uid())).map((r) => [r.recipe_id, `${r.emoji} ${r.name}`]),
    );
    const label = (ids: number[]) =>
      ids.map((id) => ({ recipe_id: id, name: names.get(id) ?? "(missing recipe)" }));
    const week: Record<string, Record<string, unknown>> = {};
    for (const day of DAYS) {
      week[day] = {};
      for (const meal of MEALS) {
        const slot = plan.week[day][meal];
        week[day][meal] = {
          recipes: label(slot.recipeIds),
          ...(slot.quickLogs?.length ? { quickLogs: slot.quickLogs } : {}),
        };
      }
    }
    return ok({
      week,
      snacks: {
        recipes: label(plan.snacks.recipeIds),
        ...(plan.snacks.quickLogs?.length ? { quickLogs: plan.snacks.quickLogs } : {}),
      },
    });
  }),
);

server.registerTool(
  "set_meal_slot",
  {
    description:
      "Set the recipes in one calendar slot (replaces that slot's recipe list; quick-logs are kept). Use meal 'snacks' with no day for the weekly snacks slot. Pass an empty list to clear the slot.",
    inputSchema: {
      day: z.enum(DAYS).optional().describe("Required unless meal is 'snacks'"),
      meal: z.enum([...MEALS, "snacks"] as const),
      recipe_ids: z.array(z.number().int()),
    },
  },
  safe(async ({ day, meal, recipe_ids }) => {
    const userId = await uid();
    const owned = new Set((await getRecipes(userId)).map((r) => r.recipe_id));
    const missing = recipe_ids.filter((id) => !owned.has(id));
    if (missing.length) throw new Error(`Not your recipes: ${missing.join(", ")}`);

    const plan = await loadPlan();
    if (meal === "snacks") {
      plan.snacks.recipeIds = recipe_ids;
    } else {
      if (!day) throw new Error("day is required for breakfast/lunch/dinner");
      plan.week[day][meal].recipeIds = recipe_ids;
    }
    await upsertMealPlan(userId, JSON.stringify(plan));
    return ok({ updated: true, day: day ?? null, meal, recipe_ids });
  }),
);

server.registerTool(
  "clear_meal_plan",
  {
    description: "Delete the entire weekly meal plan. Requires confirm: true.",
    inputSchema: { confirm: z.literal(true) },
  },
  safe(async () => {
    await deleteMealPlan(await uid());
    return ok({ cleared: true });
  }),
);

// ----- Daily macro tracker -------------------------------------------------

server.registerTool(
  "get_daily_log",
  {
    description:
      "Get tracker entries for one date (default today) or a date range, with totals per day vs. the user's goals.",
    inputSchema: {
      date: dateSchema.optional(),
      end_date: dateSchema.optional().describe("If set, returns the range date..end_date"),
    },
  },
  safe(async ({ date, end_date }) => {
    const userId = await uid();
    const start = date ?? todayLocal();
    const logs = end_date
      ? await getDailyLogRange(userId, start, end_date)
      : [(await getDailyLog(userId, start)) ?? { log_date: start, entries: [] }];
    const u = await currentUser();
    const withTotals = logs.map((log) => {
      const t = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, sugar_g: 0 };
      for (const e of log.entries) {
        t.calories += e.calories ?? 0;
        t.protein_g += e.protein_g ?? 0;
        t.fat_g += e.fat_g ?? 0;
        t.carbs_g += e.carbs_g ?? 0;
        t.sugar_g += e.sugar_g ?? 0;
      }
      for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] = round1(t[k]);
      return { ...log, totals: t };
    });
    return ok({
      goals: {
        calories: u.goal_calories,
        protein_g: u.goal_protein_g,
        fat_g: u.goal_fat_g,
        carbs_g: u.goal_carbs_g,
      },
      logs: withTotals,
    });
  }),
);

server.registerTool(
  "add_daily_log_entry",
  {
    description:
      "Log food to the daily tracker. Pass recipe_id to log a recipe (macros computed from per-serving values × servings), or pass name + macros for a manual entry. Manual macros are TOTALS for the entry.",
    inputSchema: {
      date: dateSchema.optional().describe("Defaults to today"),
      slot: z.enum(DAILY_SLOTS),
      recipe_id: z.number().int().optional(),
      servings: z.number().positive().default(1),
      name: z.string().optional().describe("Required for manual entries"),
      calories: macroNum.optional(),
      protein_g: macroNum.optional(),
      fat_g: macroNum.optional(),
      carbs_g: macroNum.optional(),
      sugar_g: macroNum.optional(),
    },
  },
  safe(async (a) => {
    const userId = await uid();
    const date = a.date ?? todayLocal();
    let entry: DailyLogEntry;
    if (a.recipe_id) {
      const r = await requireRecipe(a.recipe_id);
      const m = a.servings;
      entry = {
        id: randomUUID(),
        slot: a.slot,
        kind: "recipe",
        recipe_id: r.recipe_id,
        name: a.name ?? r.name,
        servings: m,
        calories: round1(r.per_serving_calories * m),
        protein_g: round1(r.per_serving_protein_g * m),
        fat_g: round1(r.per_serving_fat_g * m),
        carbs_g: round1(r.per_serving_carbs_g * m),
        sugar_g: round1(r.per_serving_sugar_g * m),
        logged_at: new Date().toISOString(),
      };
    } else {
      if (!a.name?.trim()) throw new Error("name is required for a manual entry");
      entry = {
        id: randomUUID(),
        slot: a.slot,
        kind: "manual",
        name: a.name.trim(),
        servings: a.servings,
        calories: a.calories ?? null,
        protein_g: a.protein_g ?? null,
        fat_g: a.fat_g ?? null,
        carbs_g: a.carbs_g ?? null,
        sugar_g: a.sugar_g ?? null,
        logged_at: new Date().toISOString(),
      };
    }
    const existing = (await getDailyLog(userId, date)) ?? { log_date: date, entries: [] };
    await upsertDailyLog(userId, {
      ...existing,
      entries: [...existing.entries, entry],
    });
    return ok({ added: true, date, entry });
  }),
);

server.registerTool(
  "remove_daily_log_entry",
  {
    description: "Remove one tracker entry by its id (from get_daily_log).",
    inputSchema: { date: dateSchema, entry_id: z.string() },
  },
  safe(async ({ date, entry_id }) => {
    const userId = await uid();
    const log = await getDailyLog(userId, date);
    const removed = log?.entries.find((e) => e.id === entry_id);
    if (!log || !removed) throw new Error(`Entry ${entry_id} not found on ${date}`);
    const entries = log.entries.filter((e) => e.id !== entry_id);
    if (entries.length === 0 && !log.notes) {
      await deleteDailyLog(userId, date);
    } else {
      await upsertDailyLog(userId, { ...log, entries });
    }
    return ok({ removed: true, date, entry: removed });
  }),
);

server.registerTool(
  "set_daily_notes",
  {
    description: "Set (or clear with empty string) the notes for a tracker day.",
    inputSchema: { date: dateSchema, notes: z.string() },
  },
  safe(async ({ date, notes }) => {
    const userId = await uid();
    const log = (await getDailyLog(userId, date)) ?? { log_date: date, entries: [] };
    await upsertDailyLog(userId, { ...log, notes: notes || undefined });
    return ok({ updated: true, date, notes });
  }),
);

// ----- Goals ---------------------------------------------------------------

server.registerTool(
  "set_macro_goals",
  {
    description:
      "Update daily macro goals. Only fields you pass change; pass null to clear one.",
    inputSchema: {
      calories: z.number().int().nonnegative().nullable().optional(),
      protein_g: z.number().int().nonnegative().nullable().optional(),
      fat_g: z.number().int().nonnegative().nullable().optional(),
      carbs_g: z.number().int().nonnegative().nullable().optional(),
    },
  },
  safe(async (a) => {
    const u = await currentUser();
    const goals = {
      calories: a.calories === undefined ? u.goal_calories : a.calories,
      protein_g: a.protein_g === undefined ? u.goal_protein_g : a.protein_g,
      fat_g: a.fat_g === undefined ? u.goal_fat_g : a.fat_g,
      carbs_g: a.carbs_g === undefined ? u.goal_carbs_g : a.carbs_g,
    };
    await executeQuery(
      `UPDATE ltc_users SET goal_calories = ?, goal_protein_g = ?, goal_fat_g = ?, goal_carbs_g = ?
       WHERE user_id = ?`,
      [goals.calories, goals.protein_g, goals.fat_g, goals.carbs_g, u.user_id],
    );
    cachedUser = null; // refresh goals on next read
    return ok({ updated: true, goals });
  }),
);

// ----- Read-only SQL -------------------------------------------------------

server.registerTool(
  "sql_select",
  {
    description:
      "Run a single read-only SELECT/WITH query against the ltc_* tables (e.g. for analytics). Use ? placeholders + params. Results capped at 200 rows. Not scoped to the current user — filter by user_id yourself.",
    inputSchema: {
      query: z.string(),
      params: z.array(z.union([z.string(), z.number(), z.null()])).optional(),
    },
  },
  safe(async ({ query, params }) => {
    const q = query.trim().replace(/;\s*$/, "");
    if (!/^(select|with)\b/i.test(q) || q.includes(";")) {
      throw new Error("Only a single SELECT/WITH statement is allowed");
    }
    // Run in a READ ONLY transaction so a sneaky write is rejected by MySQL.
    const conn = await getPool().getConnection();
    try {
      await conn.query("START TRANSACTION READ ONLY");
      const [rows] = await conn.query(q, params ?? []);
      await conn.query("ROLLBACK");
      const list = rows as unknown[];
      return ok({ row_count: list.length, rows: list.slice(0, 200) });
    } catch (e) {
      await conn.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      conn.release();
    }
  }),
);

// ---------------------------------------------------------------------------

async function main() {
  await server.connect(new StdioServerTransport());
  console.error("[ltc-mcp] Let 'Em Cook MCP server running on stdio");
}

main().catch((error) => {
  console.error("[ltc-mcp] fatal", error);
  process.exit(1);
});

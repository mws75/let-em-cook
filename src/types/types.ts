export type User = {
  user_id: number;
  user_name: string;
  email: string;
  profile_pic_url: string;
  plan_tier: string;
  is_deleted: number;
  role: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

// Subscription constants
export const FREE_TIER_RECIPE_LIMIT = 10;
export const PRO_TIER_PRICE = 7.99;

export type SubscriptionInfo = {
  planTier: string;
  recipeCount: number;
  recipeLimit: number | null;
  canCreateRecipe: boolean;
};

export type Category = {
  category_id: number;
  user_id: number;
  category_name: string;
  color_hex: string;
};

export type Recipe = {
  recipe_id: number;
  user_id: number;
  user_name: string;
  is_public: 0 | 1;
  is_created_by_user: 0 | 1;
  category: string;
  name: string;
  servings: number;
  per_serving_calories: number;
  per_serving_protein_g: number;
  per_serving_fat_g: number;
  per_serving_carbs_g: number;
  per_serving_sugar_g: number;
  ingredients_json: Ingredients[];
  instructions_json: Instructions[];
  emoji: string;
  tags: string[];
  time: CookTime;
};

export type Ingredients = {
  name: string;
  quantity: number;
  unit: string;
  prep?: string;
  optional?: boolean;
  section: string;
};

export type Instructions = {
  step: number;
  text: string;
};

export type CookTime = {
  active_min: number;
  total_time: number;
};

export type UnitType = "volume" | "weight" | "count" | "other";

export type GroceryItem = {
  name: string; // normalized lowercase key
  displayName: string; // original casing for display
  quantity: number;
  unit: string;
  unitType: UnitType;
};

export type ExploreRecipe = Recipe & {
  creator_name: string;
  creator_profile_pic: string | null;
  click_count: number;
  add_count: number;
};

export type ExploreFilters = {
  search?: string;
  category?: string;
  calorieRange?:
    | "under300"
    | "300to500"
    | "500to750"
    | "750to1000"
    | "over1000";
  limit: number;
  offset?: number;
};

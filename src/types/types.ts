export type User = {
  user_id: number;
  user_name: string;
  email: string;
  profile_pic_url: string;
  plan_tier: string;
  is_deleted: number;
  role: string;
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

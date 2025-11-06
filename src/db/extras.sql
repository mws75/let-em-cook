USE `one-offs-v2`;

-- ltc_MEAL_PLANS
CREATE TABLE IF NOT EXISTS ltc_meal_plans (
  meal_plan_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NOT NULL,
  name                VARCHAR(255)     NOT NULL,
  week_start_date     DATE             NULL,
  max_recipes_allowed INT              NOT NULL DEFAULT 10,
  is_locked           TINYINT(1)       NOT NULL DEFAULT 0,
  created_on          DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (meal_plan_id),
  KEY ix_meal_plans_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ltc_MEAL_PLAN_RECIPES
CREATE TABLE IF NOT EXISTS ltc_meal_plan_recipes (
  meal_plan_recipe_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_plan_id        BIGINT UNSIGNED NOT NULL,
  recipe_id           BIGINT UNSIGNED NOT NULL,
  meal_slot           VARCHAR(50)      NULL,          -- "Mon Dinner"
  servings_planned    DECIMAL(5,2)     NOT NULL DEFAULT 1.00,
  created_on          DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (meal_plan_recipe_id),
  KEY ix_mpr_plan (meal_plan_id),
  KEY ix_mpr_recipe (recipe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ltc_GROCERY_LISTS
CREATE TABLE IF NOT EXISTS ltc_grocery_lists (
  grocery_list_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_plan_id        BIGINT UNSIGNED NOT NULL,
  list_json           LONGTEXT         NOT NULL,      -- final grouped items by aisle with merged quantities
  generated_by_model  VARCHAR(64)      NULL,          -- "gpt-4.1", "gpt-5", "claude-3"
  is_final            TINYINT(1)       NOT NULL DEFAULT 1,
  created_on          DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (grocery_list_id),
  KEY ix_gl_plan (meal_plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ltc_NUTRITION_SUMMARIES
CREATE TABLE IF NOT EXISTS ltc_nutrition_summaries (
  nutrition_summary_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_plan_id          BIGINT UNSIGNED NOT NULL,
  total_calories        DECIMAL(12,3)   NOT NULL,
  total_protein_g       DECIMAL(12,3)   NOT NULL,
  total_fat_g           DECIMAL(12,3)   NOT NULL,
  total_carbs_g         DECIMAL(12,3)   NOT NULL,
  total_sugar_g         DECIMAL(12,3)   NOT NULL,
  calories_per_day_json JSON            NULL,        -- optional breakdown for charts
  created_on            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (nutrition_summary_id),
  KEY ix_ns_plan (meal_plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


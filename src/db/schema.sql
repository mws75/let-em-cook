-- db/schema.sql
-- Global defaults
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Using existing PlanetScale database: one-offs-v2
USE `one-offs-v2`;

-- ltc_USERS
CREATE TABLE IF NOT EXISTS ltc_users (
  user_id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_name         VARCHAR(255)     NOT NULL,
  email             VARCHAR(255)     NOT NULL,
  profile_pic_url   VARCHAR(255)     NULL,
  plan_tier         VARCHAR(25)      NOT NULL DEFAULT 'free',
  is_deleted        TINYINT(1)       NOT NULL DEFAULT 0,
  created_on        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY ux_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ltc_CATEGORIES (per-user)
CREATE TABLE IF NOT EXISTS ltc_categories (
  category_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  category_name     VARCHAR(50)      NOT NULL,
  color_hex         VARCHAR(20)      NULL,
  created_on        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  KEY ix_categories_user (user_id),
  UNIQUE KEY ux_categories_user_name (user_id, category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ltc_EMOJIS (global lookup)
CREATE TABLE IF NOT EXISTS ltc_emojis (
  emoji_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  emoji             VARCHAR(255)     NOT NULL,   -- store unicode string or short name
  created_on        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (emoji_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ltc_RECIPES
-- Note: using JSON columns for flexible ingredients/instructions
CREATE TABLE IF NOT EXISTS ltc_recipes (
  recipe_id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id               BIGINT UNSIGNED NOT NULL,
  category_id           BIGINT UNSIGNED NULL,
  name                  VARCHAR(255)    NOT NULL,
  num_servings          DECIMAL(5,2)    NOT NULL DEFAULT 1.00,
  ingredients_json      JSON            NOT NULL,        -- structured list you/AI maintain
  instructions_json     JSON            NOT NULL,        -- structured steps
  emoji_id              BIGINT UNSIGNED NULL,
  is_public             TINYINT(1)      NOT NULL DEFAULT 0,
  created_on            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (recipe_id),
  KEY ix_recipes_user (user_id),
  KEY ix_recipes_category (category_id),
  KEY ix_recipes_emoji (emoji_id),
  KEY ix_recipes_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ltc_MACROS_CACHE (hash-keyed cache of per-serving macros)
-- Store deterministic DECIMALs to avoid floating-point drift
CREATE TABLE IF NOT EXISTS ltc_macros_cache (
  hash_id                 VARCHAR(255)    NOT NULL,
  source_recipe_id        BIGINT UNSIGNED NULL,
  per_serving_calories    DECIMAL(10,3)   NOT NULL,
  per_serving_protein_g   DECIMAL(10,3)   NOT NULL,
  per_serving_fat_g       DECIMAL(10,3)   NOT NULL,
  per_serving_carbs_g     DECIMAL(10,3)   NOT NULL,
  per_serving_sugar_g     DECIMAL(10,3)   NOT NULL,
  num_servings_used       DECIMAL(5,2)    NOT NULL DEFAULT 1.00,
  created_on              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_on              DATE            NOT NULL,
  PRIMARY KEY (hash_id),
  KEY ix_macros_cache_recipe (source_recipe_id),
  KEY ix_macros_cache_expires (expires_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Helpful views (optional):

-- Latest, non-deleted users (example view structure)
-- CREATE OR REPLACE VIEW v_active_users AS
-- SELECT * FROM users WHERE is_deleted = 0;



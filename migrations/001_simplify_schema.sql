-- Migration: Simplify Recipe Schema
-- Date: 2026-01-08
-- Description: Remove unnecessary tables (macros_cache, emojis) and denormalize recipe data

-- ============================================================================
-- STEP 1: Backup (if needed)
-- ============================================================================
-- Run this manually if you have any data:
-- CREATE TABLE ltc_recipes_backup AS SELECT * FROM ltc_recipes;

-- ============================================================================
-- STEP 2: Alter ltc_recipes table
-- ============================================================================

-- Add new macro columns
ALTER TABLE ltc_recipes
ADD COLUMN per_serving_calories DECIMAL(10,3) NULL COMMENT 'Calories per serving',
ADD COLUMN per_serving_protein_g DECIMAL(10,3) NULL COMMENT 'Protein in grams per serving',
ADD COLUMN per_serving_fat_g DECIMAL(10,3) NULL COMMENT 'Fat in grams per serving',
ADD COLUMN per_serving_carbs_g DECIMAL(10,3) NULL COMMENT 'Carbohydrates in grams per serving',
ADD COLUMN per_serving_sugar_g DECIMAL(10,3) NULL COMMENT 'Sugar in grams per serving';

-- Add emoji as direct string (replacing emoji_id FK)
ALTER TABLE ltc_recipes
ADD COLUMN emoji VARCHAR(10) NULL COMMENT 'Emoji Unicode character';

-- Add tags as JSON array
ALTER TABLE ltc_recipes
ADD COLUMN tags_json JSON NULL COMMENT 'Array of tag strings';

-- Add time fields
ALTER TABLE ltc_recipes
ADD COLUMN active_time_min INT NULL COMMENT 'Active cooking time in minutes',
ADD COLUMN total_time_min INT NULL COMMENT 'Total time including prep in minutes';

-- Rename num_servings to servings (to match Recipe type)
ALTER TABLE ltc_recipes
CHANGE COLUMN num_servings servings DECIMAL(5,2) NOT NULL DEFAULT 1.00 COMMENT 'Number of servings';

-- ============================================================================
-- STEP 3: Drop foreign key and emoji_id column
-- ============================================================================

-- Drop the foreign key constraint first
ALTER TABLE ltc_recipes
DROP FOREIGN KEY ltc_recipes_ibfk_3;  -- Adjust FK name if different

-- Drop the index on emoji_id
ALTER TABLE ltc_recipes
DROP INDEX ix_recipes_emoji;  -- Adjust index name if different

-- Drop the emoji_id column
ALTER TABLE ltc_recipes
DROP COLUMN emoji_id;

-- ============================================================================
-- STEP 4: Drop unnecessary tables
-- ============================================================================

-- Drop macros cache table (not needed - macros calculated once)
DROP TABLE IF EXISTS ltc_macros_cache;

-- Drop emojis table (storing emoji strings directly now)
DROP TABLE IF EXISTS ltc_emojis;

-- ============================================================================
-- STEP 5: Verify the new structure
-- ============================================================================

-- Check the updated table structure
DESCRIBE ltc_recipes;

-- Expected columns:
-- recipe_id, user_id, category_id, name, servings, ingredients_json,
-- instructions_json, is_public, per_serving_calories, per_serving_protein_g,
-- per_serving_fat_g, per_serving_carbs_g, per_serving_sugar_g, emoji,
-- tags_json, active_time_min, total_time_min, created_on, modified_on

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This migration is designed for a fresh database with no data
-- 2. If you have existing data, you'll need to:
--    a. Migrate emoji_id → emoji string before dropping emoji_id
--    b. Migrate macros_cache data → recipe macro columns
-- 3. The category_id FK is intentionally kept for color management
-- 4. Run this in a transaction if your database supports DDL transactions

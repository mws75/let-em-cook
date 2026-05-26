-- Migration: Add favorites support to recipes
-- Date: 2026-05-26
-- Description: Adds an `is_favorite` flag to ltc_recipes so users can star a
--              handful of their saved recipes for quick access in the
--              dashboard's Favorites section. Stored as a per-recipe boolean
--              on the user's own row (favorites only apply to recipes already
--              in the user's collection, including those copied from Explore),
--              which avoids a join table while keeping the schema style.
--
-- See: src/lib/database/recipes.ts (toggleRecipeFavorite, getRecipes),
--      src/app/api/recipes/[id]/favorite/route.ts,
--      src/components/FavoriteRecipes.tsx

USE `one-offs-v2`;

-- ============================================================================
-- STEP 1: Add column
-- ============================================================================

ALTER TABLE ltc_recipes
  ADD COLUMN is_favorite TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'User has starred this recipe for the Favorites section';

-- ============================================================================
-- STEP 2: Index for the dashboard "favorites for user" query
-- ============================================================================
-- Covers: WHERE user_id = ? AND is_favorite = 1 ORDER BY modified_on DESC
-- Tiny table per-user; (user_id, is_favorite) is sufficient — modified_on
-- order is then a small in-memory sort over the matched rows.

ALTER TABLE ltc_recipes
  ADD KEY ix_recipes_user_favorite (user_id, is_favorite);

-- ============================================================================
-- STEP 3: Verify
-- ============================================================================

DESCRIBE ltc_recipes;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. PlanetScale-compatible: no FOREIGN KEY constraints; default 0 so all
--    existing rows are non-favorites with no backfill required.
-- 2. is_favorite is per-row (per-user copy), so when a user adds a public
--    recipe from Explore via copyRecipeToUser, the new row starts unstarred
--    even if the original creator had favorited their own copy.

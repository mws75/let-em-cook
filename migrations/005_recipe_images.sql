-- Migration: Add photo support to recipes
-- Date: 2026-08-28
-- Description: Adds an `image_url` column to ltc_recipes holding the public
--              DigitalOcean Spaces CDN URL of a recipe photo. NULL means no
--              photo — the UI falls back to the recipe emoji on the category
--              color. Photos are uploaded via POST /api/recipes/[id]/image and
--              served directly from the Spaces CDN (no signed URLs).
--
-- See: src/lib/storage.ts (Spaces upload/delete),
--      src/lib/database/recipes.ts (updateRecipeImage, clearRecipeImage, SELECTs),
--      src/app/api/recipes/[id]/image/route.ts,
--      src/components/RecipePhoto.tsx
--
-- Note: copied recipes (copyRecipeToUser, seedStarterRecipes) carry the same
-- image_url as their source, so multiple rows may reference one Spaces object.
-- deleteObjectByUrl only fires on an owner's explicit Change/Remove; recipe
-- deletion does NOT delete the object (avoids breaking shared copies).

USE `one-offs-v2`;

-- ============================================================================
-- STEP 1: Add column
-- ============================================================================

ALTER TABLE ltc_recipes
  ADD COLUMN image_url VARCHAR(512) NULL
    COMMENT 'Public Spaces CDN URL of the recipe photo; NULL = emoji fallback';

-- ============================================================================
-- STEP 2: Verify
-- ============================================================================

DESCRIBE ltc_recipes;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. PlanetScale-compatible: no FOREIGN KEY constraints; nullable with no
--    default so all existing rows are photo-less with no backfill required.
-- 2. No index — image_url is never filtered or sorted on.

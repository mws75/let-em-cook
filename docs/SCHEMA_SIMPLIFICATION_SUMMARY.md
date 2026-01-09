# Database Schema Simplification Summary

**Date:** 2026-01-08 | **Status:** ✅ Ready for Implementation

---

## What Changed

### Tables Removed
- ❌ `ltc_macros_cache` - Unnecessary (macros calculated once via OpenAI)
- ❌ `ltc_emojis` - Unnecessary (just store emoji strings directly)

### Tables Kept
- ✅ `ltc_users` - No changes
- ✅ `ltc_categories` - No changes (used for color management)
- ✅ `ltc_recipes` - **Significantly enhanced** (see below)

### New Columns Added to `ltc_recipes`

| Column | Type | Description |
|--------|------|-------------|
| `per_serving_calories/protein_g/fat_g/carbs_g/sugar_g` | `DECIMAL(10,3)` | Macros (5 columns) |
| `emoji` | `VARCHAR(10)` | Emoji string (replaces emoji_id FK) |
| `tags_json` | `JSON` | Tag array |
| `active_time_min` | `INT` | Active cooking time |
| `total_time_min` | `INT` | Total time |

**Also:** Renamed `num_servings` → `servings`

---

## Before vs. After

### Insert Recipe

| Before | After |
|--------|-------|
| 5 steps: lookup emoji, create emoji, lookup category, insert recipe, insert macros cache | 2 steps: lookup/create category, insert recipe with all fields |

### Query Recipe

| Before | After |
|--------|-------|
| `SELECT` with 3 JOINs (recipes + emojis + categories + macros_cache) | `SELECT * FROM ltc_recipes` (single table) |

---

## Key Benefits

1. **Matches TypeScript Type** - Database structure = Recipe type (no impedance mismatch)
2. **All Fields Accounted For** - tags & time now stored (were missing)
3. **Simpler Queries** - No joins needed for recipe data
4. **Faster** - Single table lookup vs. 3-4 joins
5. **MVP Ready** - Can ship without over-engineering

---

## Migration

**File:** `/migrations/001_simplify_schema.sql`

**Run when ready:**
```bash
mysql -h [host] -u [user] -p [database] < migrations/001_simplify_schema.sql
```

**Verify:**
```sql
DESCRIBE ltc_recipes;  -- Should show new columns
SHOW TABLES;           -- Should NOT show ltc_macros_cache or ltc_emojis
```

---

## Updated Documentation

- ✅ `DATABASE_SCHEMA.md` - Reflects new simplified structure
- ✅ `INSERT_RECIPE_IMPLEMENTATION_PLAN.md` - Simplified algorithm (5 steps → 3 steps)

---

## Design Principles Applied

- **KISS** - Single table storage, no unnecessary joins
- **YAGNI** - Removed premature optimizations (macro caching, emoji normalization)
- **Domain Alignment** - Database matches application types

---

## Next Steps

1. Run migration on PlanetScale
2. Implement `lib/database/insertRecipe.ts` (simplified version)
3. Test with sample recipe data
4. Monitor performance (should be fast enough for MVP)

---

**Result:** From 5 tables with complex joins → 3 tables with simple queries 🚀

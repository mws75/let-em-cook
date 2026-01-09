# Insert Recipe Implementation Plan

## Overview

This document outlines the implementation plan for the `insertRecipe` helper function, which will parse the Recipe JSON object (with calculated macros) and insert it into the PlanetScale database.

**Goal:** Create a reusable, transactional database helper that safely inserts recipe data into multiple tables.

---

## Architecture

### Data Flow

```
Frontend (Step 2)
  → API Route (/api/create-recipe-step-two)
    → OpenAI (Calculate Macros)
      → insertRecipe() Helper
        → PlanetScale Database
```

### Files to Create/Modify

1. ✅ **DONE**: `src/lib/database/connection.ts` - Database connection pool
2. **TODO**: `src/lib/database/insertRecipe.ts` - Main helper function
3. **TODO**: Update `src/app/api/create-recipe-step-two/route.ts` - Call helper
4. **TODO**: Update `src/app/create_recipe_step_two/page.tsx` - Handle response

---

## Database Schema Mapping

### Recipe Type (From API) → Database Tables

| Recipe Field            | Database Table | Column                  | Notes                                   |
| ----------------------- | -------------- | ----------------------- | --------------------------------------- |
| `recipe_id`             | `ltc_recipes`  | `recipe_id`             | AUTO_INCREMENT (ignore on insert)       |
| `user_id`               | `ltc_recipes`  | `user_id`               | Required                                |
| `user_name`             | N/A            | N/A                     | Not stored (lookup from ltc_users)      |
| `is_public`             | `ltc_recipes`  | `is_public`             | Map 0/1                                 |
| `category`              | `ltc_recipes`  | `category_id`           | **LOOKUP REQUIRED** (by name or create) |
| `name`                  | `ltc_recipes`  | `name`                  | Direct mapping                          |
| `servings`              | `ltc_recipes`  | `servings`              | Direct mapping                          |
| `ingredients_json`      | `ltc_recipes`  | `ingredients_json`      | JSON stringify                          |
| `instructions_json`     | `ltc_recipes`  | `instructions_json`     | JSON stringify                          |
| `emoji`                 | `ltc_recipes`  | `emoji`                 | ✅ Direct string mapping                |
| `tags`                  | `ltc_recipes`  | `tags_json`             | ✅ JSON stringify array                 |
| `time.active_min`       | `ltc_recipes`  | `active_time_min`       | ✅ Direct mapping                       |
| `time.total_time`       | `ltc_recipes`  | `total_time_min`        | ✅ Direct mapping                       |
| `per_serving_calories`  | `ltc_recipes`  | `per_serving_calories`  | ✅ Direct mapping                       |
| `per_serving_protein_g` | `ltc_recipes`  | `per_serving_protein_g` | ✅ Direct mapping                       |
| `per_serving_fat_g`     | `ltc_recipes`  | `per_serving_fat_g`     | ✅ Direct mapping                       |
| `per_serving_carbs_g`   | `ltc_recipes`  | `per_serving_carbs_g`   | ✅ Direct mapping                       |
| `per_serving_sugar_g`   | `ltc_recipes`  | `per_serving_sugar_g`   | ✅ Direct mapping                       |

---

## Implementation Steps

### Phase 1: Core Insert Function

#### `insertRecipe()` Function Signature

```typescript
/**
 * Inserts a recipe with calculated macros into the database
 * @param recipe - Complete recipe object with macros from OpenAI
 * @returns Object with inserted recipe_id
 */
export async function insertRecipe(
  recipe: Recipe,
): Promise<{ recipe_id: number }>;
```

#### Algorithm (Simplified!)

1. **Start Transaction**
   - Use `withTransaction()` from connection.ts
   - Ensures atomicity (all or nothing)

2. **Lookup/Create Category**

   ```sql
   SELECT category_id FROM ltc_categories
   WHERE user_id = ? AND category_name = ?
   ```

   - If not found → Create new category with default color
   - Store `category_id`

3. **Insert Recipe (Single Query)**

   ```sql
   INSERT INTO ltc_recipes (
     user_id, category_id, name, servings,
     ingredients_json, instructions_json,
     per_serving_calories, per_serving_protein_g,
     per_serving_fat_g, per_serving_carbs_g, per_serving_sugar_g,
     emoji, tags_json, active_time_min, total_time_min,
     is_public
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ```

   - Get `insertId` as `recipe_id`
   - All fields inserted in one query!

4. **Commit Transaction**
   - Return `{ recipe_id }`

5. **Error Handling**
   - Rollback on any error
   - Throw descriptive error messages

---

## Error Scenarios

| Scenario              | Handling Strategy                     |
| --------------------- | ------------------------------------- |
| Missing `user_id`     | Throw validation error before DB call |
| Missing `category`    | Use default "Uncategorized" category  |
| Missing `emoji`       | Store NULL (allowed in schema)        |
| Duplicate recipe name | Allow (recipes can have same name)    |
| DB connection failure | Throw error, let API route handle     |
| Transaction rollback  | Throw error with details              |

---

## Testing Strategy

### Unit Tests

```typescript
// src/lib/database/insertRecipe.test.ts

describe("insertRecipe", () => {
  it("should insert recipe and return recipe_id", async () => {
    const recipe = mockRecipeWithMacros();
    const result = await insertRecipe(recipe);
    expect(result.recipe_id).toBeGreaterThan(0);
  });

  it("should create new category if not exists", async () => {
    // Test category creation
  });

  it("should rollback on error", async () => {
    // Test transaction rollback
  });
});
```

### Integration Tests (Manual)

1. Insert recipe with existing category → Success
2. Insert recipe with new category → Creates category + recipe
3. Insert recipe with new emoji → Creates emoji + recipe
4. Insert recipe with DB error → Rollback, no partial data

---

## Environment Variables Required

Add to `.env.local`:

```bash
DATABASE_HOST=your-planetscale-host.psdb.cloud
DATABASE_USERNAME=your-username
DATABASE_PASSWORD=your-password
DATABASE_NAME=one-offs-v2
```

---

## Implementation Checklist

### Week 1: Core Functionality

- [x] Create `lib/database/connection.ts`
- [x] Run migration `migrations/001_simplify_schema.sql`
- [ ] Create `lib/database/insertRecipe.ts`
  - [ ] Implement transaction wrapper
  - [ ] Implement category lookup/create
  - [ ] Implement single recipe insert with all fields
- [ ] Update `api/create-recipe-step-two/route.ts`
  - [ ] Import insertRecipe helper
  - [ ] Call after OpenAI response
  - [ ] Handle success/error
- [ ] Update `create_recipe_step_two/page.tsx`
  - [ ] Display success with recipe_id
  - [ ] Redirect to recipe view page (if exists)

### Week 2: Testing & Refinement

- [ ] Write unit tests for insertRecipe
- [ ] Manual testing with real data
- [ ] Add error logging
- [ ] Optimize queries (if needed)
- [ ] Add retry logic for transient errors

### Week 3: Future Enhancements

- [ ] Implement recipe update function
- [ ] Implement recipe delete function (soft delete)
- [ ] Add full-text search on recipe names/ingredients
- [ ] Add recipe sharing/forking features
- [ ] Add caching layer (Redis?)

---

## Schema Design Changes (Completed ✅)

The database schema has been **simplified** based on actual usage patterns:

1. **✅ Removed `ltc_macros_cache` table**
   - Macros are now stored directly in `ltc_recipes`
   - No caching needed (calculated once via OpenAI)

2. **✅ Removed `ltc_emojis` table**
   - Emojis now stored as VARCHAR strings directly
   - No normalization needed

3. **✅ Added `tags_json` to `ltc_recipes`**
   - Store tags as JSON array
   - Simple and flexible

4. **✅ Added time fields to `ltc_recipes`**
   - `active_time_min INT`
   - `total_time_min INT`

5. **✅ Kept `ltc_categories` table**
   - Used for user-defined category management with colors
   - Referenced via FK for color lookups

**Result**: Single-table recipe storage with all fields accounted for!

---

## Performance Considerations

1. **Connection Pooling**: Already implemented in connection.ts (10 connections)
2. **Indexes**: Existing indexes on user_id, category_id, is_public are sufficient
3. **Transactions**: Use for data consistency, but keep them short (2 queries max)
4. **JSON Columns**: MySQL 8+ handles JSON efficiently, no optimization needed
5. **Single INSERT**: All recipe data inserted in one query for speed
6. **Future**: Add full-text index on recipe name if search becomes slow

---

## Rollback Plan

If insertRecipe causes issues in production:

1. **Immediate**: Disable the API route (return 503)
2. **Investigate**: Check logs for specific error
3. **Fix**: Update helper function
4. **Redeploy**: Test in staging first
5. **Cleanup**: Manually remove any partial inserts

---

## Success Metrics

- ✅ Recipe inserts complete in < 500ms
- ✅ 100% transaction atomicity (no partial data)
- ✅ Zero data loss on errors
- ✅ Proper error messages returned to client

---

## Next Steps

1. Implement `lib/database/insertRecipe.ts` following the algorithm above
2. Test with sample recipe data
3. Integrate into API route
4. Deploy and monitor

---

**Document Version**: 1.0
**Last Updated**: 2026-01-08
**Status**: Ready for Implementation

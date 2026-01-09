# Database Schema Documentation

## Overview

This document describes the database schema for the Let 'Em Cook recipe management application. The database uses MySQL/PlanetScale and is designed to support multi-user recipe management with categories, nutritional tracking, and social features.

**Database Name:** `one-offs-v2`
**Character Set:** `utf8mb4`
**Time Zone:** UTC

---

## Tables

### 1. `ltc_users`

Stores user account information and preferences.

| Column            | Type              | Constraints                         | Description                                 |
| ----------------- | ----------------- | ----------------------------------- | ------------------------------------------- |
| `user_id`         | `BIGINT UNSIGNED` | PRIMARY KEY, AUTO_INCREMENT         | Unique user identifier                      |
| `user_name`       | `VARCHAR(255)`    | NOT NULL                            | Display name for the user                   |
| `email`           | `VARCHAR(255)`    | NOT NULL, UNIQUE                    | User's email address (login credential)     |
| `profile_pic_url` | `VARCHAR(255)`    | NULL                                | URL to user's profile picture               |
| `plan_tier`       | `VARCHAR(25)`     | NOT NULL, DEFAULT 'free'            | Subscription tier (e.g., 'free', 'premium') |
| `is_deleted`      | `TINYINT(1)`      | NOT NULL, DEFAULT 0                 | Soft delete flag (0=active, 1=deleted)      |
| `created_on`      | `DATETIME`        | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Account creation timestamp                  |
| `modified_on`     | `DATETIME`        | NOT NULL, AUTO-UPDATE               | Last modification timestamp                 |

**Indexes:**

- Primary Key: `user_id`
- Unique Key: `email` (ux_users_email)

---

### 2. `ltc_categories`

User-defined recipe categories (e.g., "Breakfast", "Dinner", "Desserts").

| Column          | Type              | Constraints                         | Description                   |
| --------------- | ----------------- | ----------------------------------- | ----------------------------- |
| `category_id`   | `BIGINT UNSIGNED` | PRIMARY KEY, AUTO_INCREMENT         | Unique category identifier    |
| `user_id`       | `BIGINT UNSIGNED` | NOT NULL                            | Foreign key to `ltc_users`    |
| `category_name` | `VARCHAR(50)`     | NOT NULL                            | Name of the category          |
| `color_hex`     | `VARCHAR(20)`     | NULL                                | Hex color code for UI display |
| `created_on`    | `DATETIME`        | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Category creation timestamp   |
| `modified_on`   | `DATETIME`        | NOT NULL, AUTO-UPDATE               | Last modification timestamp   |

**Indexes:**

- Primary Key: `category_id`
- Index: `user_id` (ix_categories_user)
- Unique Key: `(user_id, category_name)` (ux_categories_user_name) - prevents duplicate category names per user

**Relationships:**

- `user_id` → `ltc_users.user_id` (one user has many categories)

---

### 3. `ltc_recipes`

Core table storing recipe information with flexible JSON columns for ingredients, instructions, tags, and nutritional macros.

| Column                  | Type              | Constraints                         | Description                                                 |
| ----------------------- | ----------------- | ----------------------------------- | ----------------------------------------------------------- |
| `recipe_id`             | `BIGINT UNSIGNED` | PRIMARY KEY, AUTO_INCREMENT         | Unique recipe identifier                                    |
| `user_id`               | `BIGINT UNSIGNED` | NOT NULL                            | Foreign key to `ltc_users` (recipe owner)                   |
| `category_id`           | `BIGINT UNSIGNED` | NULL                                | Foreign key to `ltc_categories`                             |
| `name`                  | `VARCHAR(255)`    | NOT NULL                            | Recipe name/title                                           |
| `servings`              | `DECIMAL(5,2)`    | NOT NULL, DEFAULT 1.00              | Number of servings the recipe makes                         |
| `ingredients_json`      | `JSON`            | NOT NULL                            | Structured list of ingredients (see JSON structure below)   |
| `instructions_json`     | `JSON`            | NOT NULL                            | Structured list of cooking steps (see JSON structure below) |
| `per_serving_calories`  | `DECIMAL(10,3)`   | NULL                                | Calories per serving                                        |
| `per_serving_protein_g` | `DECIMAL(10,3)`   | NULL                                | Protein in grams per serving                                |
| `per_serving_fat_g`     | `DECIMAL(10,3)`   | NULL                                | Fat in grams per serving                                    |
| `per_serving_carbs_g`   | `DECIMAL(10,3)`   | NULL                                | Carbohydrates in grams per serving                          |
| `per_serving_sugar_g`   | `DECIMAL(10,3)`   | NULL                                | Sugar in grams per serving                                  |
| `emoji`                 | `VARCHAR(10)`     | NULL                                | Emoji Unicode character (e.g., 🍕)                          |
| `tags_json`             | `JSON`            | NULL                                | Array of tag strings (see JSON structure below)             |
| `active_time_min`       | `INT`             | NULL                                | Active cooking time in minutes                              |
| `total_time_min`        | `INT`             | NULL                                | Total time including prep in minutes                        |
| `is_public`             | `TINYINT(1)`      | NOT NULL, DEFAULT 0                 | Public visibility flag (0=private, 1=public)                |
| `created_on`            | `DATETIME`        | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Recipe creation timestamp                                   |
| `modified_on`           | `DATETIME`        | NOT NULL, AUTO-UPDATE               | Last modification timestamp                                 |

**Indexes:**

- Primary Key: `recipe_id`
- Index: `user_id` (ix_recipes_user)
- Index: `category_id` (ix_recipes_category)
- Index: `is_public` (ix_recipes_public)

**Relationships:**

- `user_id` → `ltc_users.user_id` (one user has many recipes)
- `category_id` → `ltc_categories.category_id` (one category has many recipes, used for color management)

**JSON Structure:**

`ingredients_json` array of objects:

```json
[
  {
    "name": "ingredient name",
    "quantity": 1.5,
    "unit": "cup",
    "prep": "diced",
    "optional": true,
    "section": "produce"
  }
]
```

`instructions_json` array of objects:

```json
[
  {
    "step": 1,
    "text": "Step instructions here"
  }
]
```

`tags_json` array of strings:

```json
["breakfast", "quick", "eggs", "protein"]
```

---

## Entity Relationship Diagram

```
ltc_users (1) ----< (M) ltc_categories
    |
    |
    +---< (M) ltc_recipes >--- (M,1) ltc_categories
```

**Legend:**

- `(1)` = One
- `(M)` = Many
- `---<` = One-to-Many relationship
- `>---` = Many-to-One relationship

---

## Design Notes

1. **Soft Deletes:** The `ltc_users` table uses `is_deleted` flag for soft deletion to preserve data integrity and allow for account recovery.

2. **JSON Columns:** The `ltc_recipes` table uses JSON columns for `ingredients_json`, `instructions_json`, and `tags_json` to allow flexible, schema-less storage of variable-length lists.

3. **Denormalized Macros:** Nutritional macros are stored directly in `ltc_recipes` rather than a separate cache table. This simplifies queries and matches the use case where macros are calculated once at recipe creation via OpenAI.

4. **Emoji Storage:** Emojis are stored as VARCHAR Unicode strings directly in `ltc_recipes` rather than normalized. This avoids unnecessary joins and matches how emojis are used in the application.

5. **Category Management:** The `ltc_categories` table is kept for user-defined category management with custom colors, but referenced via FK for optional color lookups.

6. **Timestamps:** All tables include `created_on` and `modified_on` timestamps for audit trails and data tracking.

7. **Character Encoding:** All tables use `utf8mb4` character set to support full Unicode, including emojis and international characters.

8. **Indexing Strategy:** Indexes are placed on:
   - Foreign keys for join performance
   - Boolean flags used in WHERE clauses (`is_public`, `is_deleted`)
   - Unique constraints to enforce data integrity

---

## Future Considerations

- Consider adding a view for active users: `v_active_users` (WHERE `is_deleted = 0`)
- May need additional tables for:
  - User relationships (followers/following)
  - Recipe ratings/reviews
  - Recipe tags
  - Meal planning
  - Shopping lists

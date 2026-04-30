-- Migration: Add Daily Macro Tracker
-- Date: 2026-04-30
-- Description: Adds ltc_daily_logs (one row per user per date) and macro goal
--              columns on ltc_users to support the new Daily Macro Tracker
--              feature, split out from the Meal Planning Calendar.
--
-- See: docs/Feat/Feat - Daily Macro Tracker.md

USE `one-offs-v2`;

-- ============================================================================
-- STEP 1: Create ltc_daily_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS ltc_daily_logs (
  log_id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  log_date          DATE             NOT NULL,
  entries_json      JSON             NOT NULL COMMENT 'Array of DailyLogEntry — see types.ts',
  notes             VARCHAR(500)     NULL,
  created_on        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_on       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  UNIQUE KEY ux_daily_logs_user_date (user_id, log_date),
  KEY ix_daily_logs_user (user_id),
  KEY ix_daily_logs_date (log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- STEP 2: Add macro goal columns to ltc_users
-- ============================================================================

ALTER TABLE ltc_users
  ADD COLUMN goal_calories  INT UNSIGNED NULL COMMENT 'Daily calorie goal',
  ADD COLUMN goal_protein_g INT UNSIGNED NULL COMMENT 'Daily protein goal in grams',
  ADD COLUMN goal_fat_g     INT UNSIGNED NULL COMMENT 'Daily fat goal in grams',
  ADD COLUMN goal_carbs_g   INT UNSIGNED NULL COMMENT 'Daily carbs goal in grams';

-- ============================================================================
-- STEP 3: Verify
-- ============================================================================

DESCRIBE ltc_daily_logs;
DESCRIBE ltc_users;

-- Expected new columns on ltc_users:
--   goal_calories, goal_protein_g, goal_fat_g, goal_carbs_g
-- Expected ltc_daily_logs columns:
--   log_id, user_id, log_date, entries_json, notes, created_on, modified_on

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. PlanetScale-compatible: PRIMARY KEY is required (sharding); no FOREIGN KEY
--    constraints used (referential integrity enforced at the application
--    layer, matching the rest of this codebase).
-- 2. UNIQUE KEY (user_id, log_date) enables INSERT ... ON DUPLICATE KEY UPDATE
--    for atomic per-day upserts (same pattern as ltc_meal_plans).
-- 3. entries_json holds the full day; small (almost always <10 items) so JSON
--    is the right fit and avoids a join-heavy entries table.
-- 4. Goal columns are NULL by default — Tracker UI hides progress bars when
--    goals are not set.

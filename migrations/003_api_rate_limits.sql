-- Migration: Add API rate-limit usage log
-- Date: 2026-05-26
-- Description: Adds ltc_api_usage, a lightweight append-only log of calls to the
--              OpenAI-backed endpoints (check-valid-ingredients,
--              check-valid-instructions, sort-grocery-list). Used to enforce a
--              per-user, per-endpoint sliding-window rate limit so a single
--              authenticated user cannot run up OpenAI costs.
--
-- See: src/lib/rateLimit.ts, src/lib/database/rateLimit.ts

USE `one-offs-v2`;

-- ============================================================================
-- STEP 1: Create ltc_api_usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS ltc_api_usage (
  usage_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  endpoint    VARCHAR(64)      NOT NULL COMMENT 'Logical endpoint key, e.g. "check-valid-ingredients"',
  created_on  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usage_id),
  KEY ix_api_usage_lookup (user_id, endpoint, created_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- STEP 2: Verify
-- ============================================================================

DESCRIBE ltc_api_usage;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. PlanetScale-compatible: PRIMARY KEY required; no FOREIGN KEY constraints
--    (referential integrity enforced at the application layer, matching the
--    rest of this codebase).
-- 2. ix_api_usage_lookup covers the COUNT query in getApiUsageCount
--    (user_id + endpoint + created_on window).
-- 3. Append-only, like ltc_contact_submissions. Rows are never read after their
--    window expires, so an occasional cleanup job can prune old rows:
--      DELETE FROM ltc_api_usage WHERE created_on < DATE_SUB(NOW(), INTERVAL 7 DAY);

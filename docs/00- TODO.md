### Minor Features 
- [x] Dashboard retains state when navigating away. 
- [ ] Filter on Category 

### Bugs and Enhancements
- [ ] Consolidate Category Information to all come from the database. See: [CONSOLIDATE_CATEGORIES_PLAN.md](./CONSOLIDATE_CATEGORIES_PLAN.md)
- [x] Review if we still need the `src/lib/categoryColors.ts` file.  I think even default should be in DB, and instead be a default list that everyone has such as userId = 0. Deciding not to move forward with this.
- [ ] 

### Grocery List Pipeline
- [ ] **Scheduled recipe-analysis job to auto-expand the normalization dictionaries.** Today `TYPO_MAP`, `PREP_ADJECTIVES`, and the unit synonym maps in `src/lib/ingredientAggregator.ts` / `src/lib/unitConverter.ts` are curated by hand, so the grocery list only collapses duplicates we have already seen. Implement as a cron-triggered API route (Vercel Cron hitting a protected `/api/cron/analyze-recipes` endpoint) rather than a separate microservice — it's a batch read-from-DB/write-to-DB job with a single consumer and no low-latency requirement, so a scheduled route is the right fit.

  **Schema changes**
  - Add `analyzed_at TIMESTAMP NULL` to the `recipes` table. Null means "needs analysis"; set to `NOW()` after the job processes the row.
  - On any recipe create or edit, set `analyzed_at = NULL` so the next run re-scans it.
  - New table `normalization_candidates` with columns: `id`, `kind` (`unit` | `prep_adjective` | `typo`), `raw`, `suggested_canonical` (nullable), `occurrences` (incremented when re-seen), `first_seen_recipe_id`, `status` (`pending` | `approved` | `rejected`), `created_at`, `reviewed_at`.

  **Job behavior** (`/api/cron/analyze-recipes`)
  - Auth: check `Authorization: Bearer ${CRON_SECRET}` header so only Vercel Cron can invoke it.
  - Select a capped batch (e.g. 100 rows) of recipes with `analyzed_at IS NULL`.
  - For each recipe, scan `ingredients_json` and flag:
    - **Unknown units** — any `unit` where `getUnitType(unit)` returns `"other"` and the string isn't already in `OTHER_UNITS`.
    - **Candidate prep adjectives** — tokens inside `name` that match `/-(ed|ly)$/` and aren't already in `PREP_ADJECTIVES`.
    - **Candidate typos** — after running `normalizeIngredientName`, names that normalize to a cluster of size 1 (singletons are suspicious) OR that are close by Levenshtein distance to an existing cluster name.
  - Upsert each finding into `normalization_candidates` (increment `occurrences` on repeat).
  - Mark the recipe row `analyzed_at = NOW()`.

  **Review flow**
  - Simple admin page `/admin/normalization` (gated by role) that lists pending candidates sorted by `occurrences DESC`.
  - Approve writes either (a) a PR-ready patch to the hand-curated maps, or (b) a row in a runtime-loaded `normalization_overrides` table so new entries apply without a redeploy. Start with (b) — it's lower friction while the system is young.
  - Reject sets `status = 'rejected'` so the same entry doesn't resurface.

  **Cron config** — add to `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/analyze-recipes", "schedule": "0 * * * *" }] }
  ```
  Hourly is plenty; can drop to daily once the backlog is drained.

  **Why a cron job, not a microservice** — single consumer, batch workload, no independent scaling need, no separate team owning it. A cron-triggered route avoids the operational tax (separate deploy, inter-service auth, cross-service observability) of a real microservice while giving the same functional outcome. See [GROCERY_LIST_AGGREGATION.md](./GROCERY_LIST_AGGREGATION.md) for the pipeline this feeds.

  **Good microservice candidates for learning** (tracked separately): macro/nutrition analyzer, recipe URL/photo ingestion service, image-processing service. Each has multiple callers and an external-API dependency that benefits from independent scaling and failure isolation.
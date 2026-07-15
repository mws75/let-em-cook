---
name: let-em-cook
description: Project context for Let 'Em Cook (letemcook.io) — a Next.js 16 recipe/meal-planning SaaS with Clerk auth, PlanetScale MySQL, OpenAI recipe pipeline, and Stripe subscriptions. Load this at the start of a session on this repo so you don't have to re-read the whole codebase — covers architecture, data model, auth, AI endpoints, billing, UI, docs organization, and conventions.
---

# Let 'Em Cook — Project Context

A **public-facing recipe & meal-planning SaaS** (letemcook.io), built and marketed solo (TikTok/ManyChat content funnel — see the dated worklog in `docs/AA - Summary - AA.md`). Core loop: input a recipe → AI validates/structures it and calculates macros → save as a tile → drag up to 10 recipes into the weekly workspace → generate an **aggregated grocery list** + weekly **nutrition macros**. Also: a public Explore feed, a calendar with meal-plan persistence, a daily macro tracker with QuickLog, and Stripe-billed tiers (**free = 20 recipes** via `FREE_TIER_RECIPE_LIMIT`, pro = unlimited). New accounts are seeded with 3 starter recipes (`STARTER_RECIPE_IDS` → `seedStarterRecipes()` in `src/lib/database/recipes.ts`, called from `createUserAndSyncMetadata` in `src/lib/auth.ts`).

## Stack

- **Next.js 16** App Router, **React 19**, **TypeScript**, **Tailwind v4** (`@theme inline` tokens in `src/app/globals.css` — cream `--color-background: #fdfbf7`) + occasional CSS modules. Living style guide at `/style-guide` (uses CodeMirror).
- **MySQL on PlanetScale** (db `one-offs-v2`), raw SQL via `mysql2/promise` — **no ORM**.
- **Clerk** auth, **OpenAI** (recipe pipeline), **Stripe** subscriptions, **nodemailer + Zoho SMTP** (contact form), **Jest** (jsdom) — `npm test`; helpers have co-located `.test.ts`.
- `npm run dev` to run. `react-hot-toast` for toasts (Toaster mounted in `layout.tsx`), `lucide-react` icons.

## Architecture (request flow)

```
Client component → fetch /api/* route handler (src/app/api) → query module (src/lib/database/*) → executeQuery/withTransaction (connection.ts pool) → PlanetScale
```

- The README claims "no API layer / RSC direct SQL" — **outdated**; the app has a full `/api` route-handler layer and the main pages are `"use client"`.
- **`src/lib/database/connection.ts`** — lazy singleton `mysql2` pool (limit 10, SSL required for PlanetScale), `executeQuery<T>()` + `withTransaction()`.
- One query module per domain: `recipes.ts`, `users.ts`, `categories.ts`, `dailyLogs.ts`, `mealPlans.ts`, `engagement.ts`, `contact.ts`, `rateLimit.ts` (all in `src/lib/database/`, re-exported via `index.ts`).
- `docs/API_REFERENCE.md` is the endpoint catalog (method/path/auth/purpose table + curl examples; see also `docs/CURL_API_TESTING.md`).

## Database (PlanetScale `one-offs-v2`, tables prefixed `ltc_`)

Canonical reference: **`docs/DATABASE_SCHEMA.md`**; DDL in `src/db/schema.sql`; incremental changes in `migrations/00*.sql` (simplify-schema, daily logs, api rate limits, recipe favorites).

- **`ltc_users`** — `plan_tier` ('free'/'premium'), goal macros (`goal_calories/protein_g/fat_g/carbs_g`), `stripe_customer_id`/`stripe_subscription_id`, soft-delete `is_deleted`.
- **`ltc_recipes`** — the core table: `ingredients_json` / `instructions_json` / `tags_json` **JSON columns**, `per_serving_*` macro DECIMALs, `servings`, `emoji`, `active_time_min`/`total_time_min`, `is_public` (Explore), `is_favorite` (dashboard Favorites — per-row flag, no join table).
- **`ltc_categories`** — per-user, `color_hex` for tile color-coding (`src/lib/categoryColors.ts`, `DEFAULT_CATEGORY_LIST`).
- **`ltc_daily_logs`** (macro tracker), **`ltc_meal_plans`** (calendar persistence — see `docs/MEAL_PLAN_PERSISTENCE_GUIDE.md`), **`ltc_api_usage`** (rate limiting), **`ltc_recipe_engagement`**, **`ltc_contact_submissions`**.
- Ingredient row shape: `{name, quantity, unit, prep, optional, section}` — `section` drives grocery-list grouping. **Macros are returned as numbers, not strings** (deliberate fix; keep it that way).

## Auth (`src/lib/auth.ts`)

- **No `middleware.ts`** — every route/page gates itself. `getAuthenticatedUserId()` resolves auth two ways: **Clerk session** (web) or an **HMAC-signed mobile Bearer token** (signed with `CLERK_SECRET_KEY`, 90-day expiry, minted at `/api/auth/mobile-callback`). Throws `UnauthenticatedError` → routes return 401.
- Clerk user ↔ `ltc_users` row mapping lives here too (creates the DB user on first sight).
- **Public without auth:** `GET /api/explore-recipes`, `GET /api/recipes/[id]`, `GET /api/categories?scope=explore` (Explore is public by design; auth required only to add/save recipes). Stripe webhook is signature-verified, not user-authed.

## OpenAI pipeline

- Shared client in `src/lib/openai.ts` — **the API key env var is literally `OPENAI`** (not `OPENAI_API_KEY`). All prompts centralized in `src/lib/prompts.ts`.
- Five AI endpoints: `check-valid-ingredients`, `check-valid-instructions`, `create-recipe` (all **gpt-4o-mini**), `create-recipe-step-two` (macro calculation — **gpt-4o**), `sort-grocery-list` (gpt-4o-mini).
- All five **require auth before spending money** and are **rate-limited 60 req/min per user per endpoint** — sliding window in `src/lib/rateLimit.ts` (`enforceAiRateLimit`, backed by `ltc_api_usage`); over-limit throws `RateLimitError` → 429.
- Two-step recipe creation UX: `/create_recipe` (structure/validate) → `/create_recipe_step_two` (macros). Grocery aggregation is local code, not AI: `src/lib/ingredientAggregator.ts` + `src/lib/unitConverter.ts` (see `docs/GROCERY_LIST_AGGREGATION.md`); AI only sorts the final list into store sections.
- Past macro bug documented in `docs/RCA/Inconsistent_Macro_Calculations.md` — read before touching macro calc.

## Stripe

- `src/lib/stripe.ts` — lazy `getStripe()` singleton (throws if `STRIPE_SECRET_KEY` unset). Routes: `stripe/create-checkout-session`, `stripe/create-portal-session`, `stripe/webhook` (updates `plan_tier` / stripe ids on `ltc_users`). Single price via `STRIPE_PRICE_ID`.
- Setup guides: `docs/STRIPE_SETUP.md` (dev) and `docs/stripe-production-setup.md` (prod). Past prod bug: `docs/RCA/Stripe_Checkout_Email_Lookup_Failure.md`.
- UI: `UpgradeButton` / `UpgradePrompt` components; free-tier recipe cap enforced server-side.

## Pages (`src/app/`)

- `/` — `LandingPage` component. `/signin` — Clerk. `/contact` — Zoho-mail contact form.
- **`/dashboard`** — the main hub (client component, big): recipe tile grid, `FavoriteRecipes`, `SelectedRecipeCard` workspace, grocery-list generation, `Calendar` (persistent meal plans), `GoalsModal`, `GettingStartedSidebar`, upgrade prompts.
- **`/dashboard/tracker`** — Daily Macro Tracker (`DailyTracker`, `TrackerLogModal`, `QuickLogModal` — QuickLog was recently in active development; check `docs/Feat/` status before assuming it's finished).
- `/explore_recipes` (public feed, `ExploreRecipeCard`), `/recipe/[id]` (detail), `/create_recipe` + `/create_recipe_step_two`, `/style-guide`.
- Shared components flat in `src/components/`; static data in `src/data/cookingTips.ts`.

## Env vars

`DATABASE_HOST/USERNAME/PASSWORD/NAME` · `CLERK_SECRET_KEY` (+ Clerk publishable key) · `OPENAI` · `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` · `ZOHO_SMTP_HOST/PORT/USER/PASSWORD` · `NEXT_PUBLIC_APP_URL`.

## docs/ — how it's organized

- **`AA - Summary - AA.md`** — dated worklog/journal; read first for current state and what's in flight. **`00- TODO.md`** — task list. `LOG.md` — log.
- **`docs/RCA/`** — root-cause writeups of past production bugs; check before "fixing" macro or Stripe behavior.
- **`docs/Feat/`** — feature specs; `Done - Feat - *.md` prefix marks shipped ones (Calendar, Daily Macro Tracker); open ones include iOS tracker and Food Database Lookup.
- Implementation guides at top level (`*_Implementation_Guide.md`, `INSERT_RECIPE_IMPLEMENTATION_PLAN.md`, `HOW_CRUD_API_WORKS.md`, `HOW_GETRECIPES_WORKS.md`, `MEAL_PLAN_PERSISTENCE_GUIDE.md`, `DATA_STRUCTURE_EXAMPLES.md`).
- `src/db/` also holds `analytic_queries.sql` and `sample_data_set.json`.

## Conventions / gotchas

- **New domain feature** = migration in `migrations/` (+ update `docs/DATABASE_SCHEMA.md`) → query module in `src/lib/database/` → `/api` route (gate with `getAuthenticatedUserId()`, catch `UnauthenticatedError`/`RateLimitError`) → client fetch from the page/component.
- Raw SQL everywhere — always parameterized via `executeQuery(query, params)`; JSON columns are parsed/stringified in the database layer, keep that boundary.
- Any new OpenAI-calling route must auth first **and** call `enforceAiRateLimit()` before the API call.
- Numbers not strings for macros in API responses.
- Calendar/meal-plan state is the most delicate area of the app (owner is deliberately re-learning it — see the 03.24 worklog entry); change it carefully and read `MEAL_PLAN_PERSISTENCE_GUIDE.md` first.
- Tests: `npm test` (Jest + jsdom); logic helpers (`dates`, `macros`, `openai`) have co-located tests — follow that pattern for new pure logic.

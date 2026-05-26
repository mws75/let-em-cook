# API Reference

A quick reference for the Let Em Cook API endpoints — handy for Postman, curl, and manual testing.

All routes live under `/api` (Next.js App Router route handlers in `src/app/api`).

## Base URL

- Local: `http://localhost:3000`
- Production: your deployed domain

## Authentication

Most endpoints require an authenticated user. Auth is resolved in two ways (`src/lib/auth.ts`):

1. **Clerk session (web)** — the Clerk session cookie is sent automatically by the browser. Hard to replicate in curl/Postman; easiest to test these from the running web app or by copying session cookies from your browser.
2. **Bearer token (mobile)** — pass a long-lived token in the header:
   ```
   Authorization: Bearer <token>
   ```
   Tokens are minted by `/api/auth/mobile-callback` (90-day expiry).

Endpoints that require auth return `401 {"error":"Not authenticated"}` when the caller is unauthenticated.

**Public / partially-public:** `GET /api/explore-recipes`, `GET /api/recipes/[id]`, and `GET /api/categories?scope=explore` work without auth (signed-in users get personalized results).

**No user auth (signature-verified):** `POST /api/stripe/webhook` is verified by Stripe signature, not user auth.

The OpenAI-backed endpoints (`check-valid-ingredients`, `check-valid-instructions`, `sort-grocery-list`, `create-recipe`, `create-recipe-step-two`) **require auth** — they call OpenAI, so they reject unauthenticated callers with `401` before spending money. They are also **rate-limited to 60 requests per minute, per user, per endpoint** (sliding window); exceeding this returns `429`. Tune the limit in `src/lib/rateLimit.ts`.

> Free tier is limited to **10 recipes** (`FREE_TIER_RECIPE_LIMIT`). Pro tier is unlimited.

---

## Endpoints at a glance

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/auth/mobile-callback` | Clerk | Mint mobile token, redirect to app |
| GET | `/api/categories` | Required (or public w/ `scope=explore`) | List categories |
| POST | `/api/check-valid-ingredients` | Required | Validate text is ingredients (AI) |
| POST | `/api/check-valid-instructions` | Required | Validate text is instructions (AI) |
| POST | `/api/contact` | Required | Send a support/contact message |
| POST | `/api/create-recipe` | Required | Step 1: convert raw recipe text to JSON (AI) |
| POST | `/api/create-recipe-step-two` | Required | Step 2: calculate macros + save recipe (AI) |
| GET | `/api/daily-log` | Required | Get daily macro log for a date |
| PUT | `/api/daily-log` | Required | Upsert daily macro log |
| DELETE | `/api/daily-log` | Required | Delete daily macro log |
| GET | `/api/daily-log/range` | Required | Get daily logs for a date range |
| GET | `/api/explore-recipes` | Optional | Browse public recipes |
| GET | `/api/get-recipes` | Required | List the current user's recipes |
| GET | `/api/meal-plan` | Required | Get the user's meal plan |
| PUT | `/api/meal-plan` | Required | Upsert the user's meal plan |
| DELETE | `/api/meal-plan` | Required | Delete the user's meal plan |
| GET | `/api/recipes/[id]` | Optional | Get a single recipe (with ownership flag) |
| DELETE | `/api/recipes/[id]` | Required | Delete a recipe |
| POST | `/api/recipes/[id]/add` | Required | Copy a public recipe into your collection |
| POST | `/api/sort-grocery-list` | Required | Aggregate + sort ingredients into a grocery list (AI) |
| POST | `/api/stripe/create-checkout-session` | Required | Start Pro subscription checkout |
| POST | `/api/stripe/create-portal-session` | Required | Open Stripe billing portal |
| POST | `/api/stripe/webhook` | Stripe sig | Stripe subscription lifecycle events |
| GET | `/api/user/goals` | Required | Get macro goals |
| PUT | `/api/user/goals` | Required | Update macro goals |
| GET | `/api/user/subscription` | Required | Get plan tier + recipe usage |

---

## Recipes

### `GET /api/get-recipes`
Returns all recipes belonging to the authenticated user.

**Response 200**
```json
{ "recipes": [ { "recipe_id": 1, "name": "...", "...": "..." } ] }
```

```bash
curl http://localhost:3000/api/get-recipes \
  -H "Authorization: Bearer $TOKEN"
```

### `GET /api/recipes/[id]`
Get a single recipe. Public — anonymous callers see only public recipes; signed-in callers also see their own (with `isOwner`).

**Response 200**
```json
{ "recipe": { "recipe_id": 12, "...": "..." }, "isOwner": true }
```
**Errors:** `400` invalid id · `404` not found

```bash
curl http://localhost:3000/api/recipes/12
```

### `DELETE /api/recipes/[id]`
Delete one of the user's recipes. Auth required.

```bash
curl -X DELETE http://localhost:3000/api/recipes/12 \
  -H "Authorization: Bearer $TOKEN"
```

### `POST /api/recipes/[id]/add`
Copy a public recipe into the authenticated user's collection.

**Response 200**
```json
{ "success": true, "newRecipeId": 45, "message": "Recipe added to your collection!" }
```
**Errors:** `400` invalid id · `404` user not found · `409` already added · `403` recipe limit reached (free tier)

```bash
curl -X POST http://localhost:3000/api/recipes/12/add \
  -H "Authorization: Bearer $TOKEN"
```

### `GET /api/explore-recipes`
Browse the public recipe feed. Optional auth (signed-in = personalized).

**Query params:** `search`, `category`, `calorieRange`, `limit` (default 18), `offset` (default 0)

**Response 200**
```json
{ "recipes": [ ... ], "hasMore": true }
```

```bash
curl "http://localhost:3000/api/explore-recipes?search=chicken&limit=18&offset=0"
```

---

## Recipe creation (two-step, AI-powered)

### `POST /api/create-recipe`
Step 1 — converts raw recipe text into a structured JSON recipe object via OpenAI. Does **not** save to the DB. Auth required; rate-limited (60/min/user → `429`).

**Body**
```json
{
  "recipeName": "Spaghetti Bolognese",
  "category": "Dinner",
  "servings": 4,
  "isPublic": 0,
  "ingredients": "1 lb ground beef\n2 cups tomato sauce\n...",
  "instructions": "1. Brown the beef\n2. Add sauce\n..."
}
```
`recipeName`, `category`, `ingredients`, `instructions` are required strings. `servings` defaults to 4, `isPublic` defaults to 0. Max combined length 20,000 chars.

**Response 200**
```json
{ "data": { "name": "...", "ingredients_json": [ ... ], "instructions_json": [ ... ], "user_id": 7, "servings": 4, "is_public": 0 } }
```
**Errors:** `400` invalid/missing input

### `POST /api/create-recipe-step-two`
Step 2 — calculates per-serving macros (OpenAI) and inserts/updates the recipe in the DB. Auth required; rate-limited (60/min/user → `429`).

**Body**
```json
{
  "recipe": { "name": "...", "ingredients_json": [ ... ], "instructions_json": [ ... ], "servings": 4 },
  "isEditMode": false,
  "editingRecipeId": null
}
```
Pass the `data` object from step 1 as `recipe`. Set `isEditMode: true` and `editingRecipeId` to update an existing recipe.

**Response 200**
```json
{ "data": { "...": "...", "per_serving_calories": 540, "per_serving_protein_g": 28.5, "per_serving_fat_g": 18.2, "per_serving_carbs_g": 45.1, "per_serving_sugar_g": 6.3 }, "recipe_id": 45 }
```
**Errors:** `400` invalid recipe · `403` recipe limit reached (free tier, new recipes only)

---

## Validation helpers (AI)

> Both require auth and are rate-limited (60/min/user/endpoint → `429`).

### `POST /api/check-valid-ingredients`
Classifies whether the supplied text actually looks like an ingredients list.

**Body:** `{ "ingredients_text": "1 cup flour\n2 eggs" }` (string, non-empty, ≤ 10,000 chars)

**Response 200:** `{ "isIngredients": true }`

### `POST /api/check-valid-instructions`
Same idea for cooking instructions.

**Body:** `{ "instructions_text": "1. Preheat oven..." }` (string, non-empty, ≤ 10,000 chars)

**Response 200:** `{ "isInstructions": true }`

---

## Grocery list

### `POST /api/sort-grocery-list`
Aggregates ingredients (with unit conversion) and sorts them by grocery-store section via OpenAI.

**Body**
```json
{ "ingredients": [ { "name": "flour", "quantity": 2, "unit": "cups" } ] }
```
`ingredients` must be a non-empty array.

**Response 200**
```json
{ "groceryItems": [ { "displayName": "flour", "quantity": 2, "unit": "cups" } ] }
```
**Errors:** `400` empty/invalid array · `401` not authenticated · `429` rate limit (60/min/user)

---

## Categories

### `GET /api/categories`
Returns the authenticated user's categories.

**Query param:** `scope=explore` — returns the default public category list **without** requiring auth.

**Response 200**
```json
{ "categories": [ { "category_name": "Dinner", "color_hex": "#FF8800" } ] }
```

```bash
curl "http://localhost:3000/api/categories?scope=explore"
```

---

## Daily macro log

### `GET /api/daily-log`
**Query param:** `date` (required, `YYYY-MM-DD`)

**Response 200:** `{ "log": { ... } | null }`

### `PUT /api/daily-log`
Upsert the log for a date.

**Body**
```json
{ "log_date": "2026-05-26", "entries": [ ... ], "notes": "optional string" }
```
`log_date` required (`YYYY-MM-DD`); `entries` must be an array.

**Response 200:** `{ "success": true }`

### `DELETE /api/daily-log`
**Query param:** `date` (required, `YYYY-MM-DD`)

**Response 200:** `{ "success": true }`

### `GET /api/daily-log/range`
**Query params:** `start`, `end` (both required, `YYYY-MM-DD`). `start` must be ≤ `end`, and the range cannot exceed 90 days.

**Response 200:** `{ "logs": [ ... ] }`

```bash
curl "http://localhost:3000/api/daily-log/range?start=2026-05-01&end=2026-05-26" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Meal plan

### `GET /api/meal-plan`
**Response 200:** `{ "plan": { ... } | null, "modifiedOn": "..." }` (`plan` is `null` if none saved)

### `PUT /api/meal-plan`
**Body:** `{ "plan": { ... } }` (required)

**Response 200:** `{ "success": true }`

### `DELETE /api/meal-plan`
**Response 200:** `{ "success": true }`

---

## User

### `GET /api/user/goals`
**Response 200**
```json
{ "goals": { "calories": 2000, "protein_g": 150, "fat_g": 60, "carbs_g": 200 } }
```

### `PUT /api/user/goals`
**Body** (any field may be a number, or `null`/`""` to clear; values must be non-negative)
```json
{ "calories": 2000, "protein_g": 150, "fat_g": 60, "carbs_g": 200 }
```
**Response 200:** `{ "success": true, "goals": { ... } }`
**Errors:** `400` negative/invalid value

### `GET /api/user/subscription`
**Response 200**
```json
{
  "planTier": "free",
  "recipeCount": 3,
  "recipeLimit": 10,
  "canCreateRecipe": true,
  "stripeCustomerId": "cus_..."
}
```
`recipeLimit` is `null` for Pro users.

---

## Contact

### `POST /api/contact`
Sends a support email (Zoho SMTP) and records the submission. Auth required. Rate-limited to **3 messages per day** per user.

**Body**
```json
{ "name": "Mike", "email": "mike@example.com", "message": "At least 10 chars, up to 2000." }
```
**Response 200:** `{ "success": true }`
**Errors:** `400` missing/invalid fields · `429` daily limit reached

---

## Stripe / billing

### `POST /api/stripe/create-checkout-session`
Creates (or reuses) a Stripe customer and starts a subscription checkout. No request body.

**Response 200:** `{ "url": "https://checkout.stripe.com/..." }` (redirect the user here)
**Errors:** `400` already Pro · `401` not authenticated

### `POST /api/stripe/create-portal-session`
Opens the Stripe billing portal for managing the subscription. No request body.

**Response 200:** `{ "url": "https://billing.stripe.com/..." }`
**Errors:** `400` no Stripe customer on file

### `POST /api/stripe/webhook`
Receives Stripe events. **Not for manual calling** — verified by the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET`. Use the Stripe CLI to test:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Handled events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` (updates the user's `plan_tier`).

---

## Auth (mobile)

### `GET /api/auth/mobile-callback`
Browser-redirect flow for the iOS app. `?start=true` redirects to the Clerk sign-in page; after sign-in it mints a 90-day HMAC token and redirects to `letemcook://auth-callback?token=...&user=...`. Not a JSON API — used by the mobile sign-in flow.

---

## Common error shape

All endpoints return errors as:
```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
| --- | --- |
| 400 | Bad/missing input |
| 401 | Not authenticated |
| 403 | Recipe limit reached (free tier) |
| 404 | Not found |
| 409 | Conflict (e.g. recipe already added) |
| 429 | Rate limit (contact form; AI helper endpoints) |
| 500 | Server error |

OpenAI-backed endpoints may also surface upstream errors (rate limits, timeouts) via `handleOpenAIError`.

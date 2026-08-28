# Feat — Recipe Pictures

Add a photo to a recipe, stored in **DigitalOcean Spaces**, displayed on the dashboard tile, explore card, recipe modal, and full detail page. Designs are locked in `Picture_Design_Prototypes/` (Tile B · Explore A · Modal = Detail B header · Detail B).

Status: **built on `feat-pictures`** — code + tests + docs landed and typecheck passes. Remaining to ship: (1) add the `DO_SPACES_*` env vars locally + in prod, (2) run `migrations/005_recipe_images.sql` against PlanetScale, (3) manual QA. Rename to `Done - Feat - Recipe Pictures.md` when shipped.

Resolved decisions: copies **share** the original's photo · store uploads **as-is** (≤4 MB, no resize) · owner **adds the env vars**. (Limit is 4 MB to stay under Vercel's 4.5 MB serverless request-body cap.)

---

## Scope

- One photo per recipe (`image_url` on `ltc_recipes`).
- Owner can **add / change / remove** the photo from the Recipe Card modal and the detail page.
- Everywhere a recipe renders, show the photo with a graceful **emoji-on-category-color fallback** when absent.
- **Out of scope for v1:** adding a photo inside the two-step create flow (photo is added post-create via modal/detail), AI image generation, multiple photos/galleries, Spaces object garbage-collection on recipe delete (see "Orphaned objects").

---

## 1. Storage — DigitalOcean Spaces (S3-compatible)

New dependency: `@aws-sdk/client-s3` (Spaces speaks the S3 API). Objects are stored **public-read** and served directly from the Spaces CDN, so no signed-URL round-trip is needed for display.

**New env vars** (add to `.env`, and to the env list in `SKILL.md` / README):

```
DO_SPACES_ENDPOINT      = https://nyc3.digitaloceanspaces.com
DO_SPACES_REGION        = nyc3
DO_SPACES_BUCKET        = letemcook-media
DO_SPACES_KEY           = <access key>
DO_SPACES_SECRET        = <secret>
DO_SPACES_CDN_BASE      = https://letemcook-media.nyc3.cdn.digitaloceanspaces.com
```

**New file: `src/lib/storage.ts`** — mirrors the lazy-singleton pattern of `src/lib/stripe.ts`:

- `getSpaces()` — lazily build an `S3Client` (`{ endpoint, region, credentials, forcePathStyle: false }`); throw if env unset, matching `getStripe()`.
- `uploadRecipeImage(recipeId, buffer, contentType) → Promise<{ url, key }>` — key = `recipes/${recipeId}/${crypto.randomUUID()}.${ext}`; `PutObjectCommand` with `ACL: "public-read"`, `CacheControl: "public, max-age=31536000, immutable"`. Return `${DO_SPACES_CDN_BASE}/${key}`.
- `deleteObjectByUrl(url)` — best-effort `DeleteObjectCommand`; parse the key back out of the CDN URL; **no-op if the URL isn't under our CDN base** (protects against deleting a shared/copied object — see Orphaned objects).
- Pure helpers (own `.test.ts`, per repo convention): `keyFromUrl(url)`, `extFromContentType(ct)`, and `validateImage({ contentType, size })` (allow `image/jpeg|png|webp`, max 4 MB).

---

## 2. Data model

**New migration: `migrations/005_recipe_images.sql`** (follow `004` style — `USE one-offs-v2;`, PlanetScale-safe, no FKs, nullable so no backfill):

```sql
ALTER TABLE ltc_recipes
  ADD COLUMN image_url VARCHAR(512) NULL
    COMMENT 'Public Spaces CDN URL of the recipe photo; NULL = use emoji fallback';
```

No index needed (never filtered/sorted on).

**Update `docs/DATABASE_SCHEMA.md`** — add `image_url` to the `ltc_recipes` table doc.

**Thread through `src/lib/database/recipes.ts`:**

- `RecipeRow` + `ExploreRecipeRow`: add `image_url: string | null`.
- `mapRowToRecipe`: `image_url: row.image_url ?? null`.
- Add `r.image_url` to every SELECT: `getRecipes`, `getRecipeById`, `getRecipeWithOwnership`, `getExploreRecipes` (and map it into the ExploreRecipe object literal).
- `copyRecipeToUser` + `seedStarterRecipes`: **carry `image_url` over** in the INSERT…SELECT (added/seeded recipes show the same photo; the object is public-read and shared — see Orphaned objects for the deletion nuance).
- New functions:
  - `updateRecipeImage(userId, recipeId, imageUrl) → { image_url } | null` — `UPDATE … SET image_url = ? WHERE recipe_id = ? AND user_id = ?`; also `SELECT` the prior `image_url` first (inside `withTransaction`) and return it so the route can delete the replaced object. Returns `null` when not owned (→ 404), matching `toggleRecipeFavorite`.
  - `clearRecipeImage(userId, recipeId) → { previousUrl } | null` — null the column, return old URL for cleanup.

**Update `src/types/types.ts`:** add `image_url: string | null;` to `Recipe` (so `ExploreRecipe` inherits it).

---

## 3. API routes

**New: `src/app/api/recipes/[id]/image/route.ts`** — same auth/ownership/error shape as `favorite/route.ts` (`getAuthenticatedUserId()`, catch `UnauthenticatedError` → 401, ownership filter → 404).

- **`POST`** — `multipart/form-data`; read via `await request.formData()`, get the `file` (a `File`/`Blob`). Validate with `validateImage()` (415 on bad type, 413 on >4 MB). `const buf = Buffer.from(await file.arrayBuffer())`. Upload to Spaces, then `updateRecipeImage(userId, recipeId, url)`; if it returns `null`, delete the just-uploaded object and 404. On replace, `deleteObjectByUrl(previousUrl)` (best-effort, don't fail the request). Return `{ image_url }`.
- **`DELETE`** — `clearRecipeImage(userId, recipeId)`; if a `previousUrl` came back, `deleteObjectByUrl` it. Return `{ ok: true }`.

Ownership is enforced by the `user_id` filter in the query functions, so a non-owner (or an added copy owned by someone else) gets 404 and can't mutate another user's photo.

**Update `docs/API_REFERENCE.md`** with both endpoints + a curl example.

> Note: no `enforceAiRateLimit` here (that's for the OpenAI routes). A light per-user guard can be added later if abuse shows up.

---

## 4. UI

Add a small shared piece to avoid duplicating upload logic between the modal and the detail page:

**New: `src/components/RecipePhoto.tsx`** — renders the photo (or emoji-on-category-color fallback) and, when `isOwner`, the **Change / Remove** controls + hidden `<input type="file">` + an "Add a photo" dropzone empty state. Handles the `POST`/`DELETE` fetches, `react-hot-toast` feedback, and calls an `onChange(image_url | null)` callback so the parent updates local state optimistically. Props: `{ recipeId, imageUrl, emoji, categoryColor, isOwner, variant, onChange }` where `variant` tunes shape per surface (`"detail" | "modal"`).

Then wire the four surfaces to their chosen layouts:

| Component | Design | Controls | Notes |
|---|---|---|---|
| `src/components/RecipeCard.tsx` | **Tile B** — 96px square photo on the left, content right | none | Photo or emoji fallback; category color moves to the fallback block. |
| `src/components/ExploreRecipeCard.tsx` | **Explore A** — hero photo on top | none (not owner) | Uses `recipe.image_url` (now in the SELECT); keep the creator avatar + Add button. |
| `src/components/RecipeDetailModal.tsx` | **Detail B header** (in the modal) | Change / Remove (owner) | Drop `<RecipePhoto variant="modal">` into a new side-by-side header; body unchanged. |
| `src/app/recipe/[id]/page.tsx` | **Detail B** — side-by-side header | Change / Remove (owner) | `<RecipePhoto variant="detail">`; keep `print:hidden` on the photo so printouts stay clean. |

Rendering uses plain `<img>` / CSS `background-image` (as `ExploreRecipeCard` already does) — **no `next/image`**, so no `next.config` domain allow-list is required. (Optional later optimization: switch to `next/image` + whitelist the CDN host.)

---

## 5. Orphaned objects (decision)

Copies (`copyRecipeToUser`, `seedStarterRecipes`) share the **same** `image_url` string as the original — they point at one Spaces object. To avoid a copy's deletion (or the original's) breaking the others:

- **`deleteObjectByUrl` only ever fires on explicit owner Change/Remove**, and only for a URL under our CDN base.
- **Recipe deletion does NOT delete the Spaces object** in v1. This can leak orphaned objects over time; acceptable given low volume. Follow-up: a periodic cleanup script that deletes objects whose key's `recipe_id` no longer exists **and** is referenced by no `image_url` row.

(Alternative considered: re-upload a fresh copy of the file on every recipe copy so each row owns its object. Rejected for v1 — more storage + a fetch/re-put on every add, for a benefit the cleanup script covers.)

---

## Build order / checklist

1. `npm i @aws-sdk/client-s3`; add env vars locally + in prod (DO).
2. `src/lib/storage.ts` (+ `storage.test.ts` for the pure helpers).
3. Migration `005_recipe_images.sql`; run it; update `docs/DATABASE_SCHEMA.md`.
4. `types.ts` + `recipes.ts` (row types, `mapRowToRecipe`, all SELECTs, copy/seed carry-over, `updateRecipeImage`, `clearRecipeImage`).
5. `api/recipes/[id]/image/route.ts` (POST + DELETE); update `docs/API_REFERENCE.md`.
6. `RecipePhoto.tsx`, then wire the 4 components.
7. Manual test: upload (jpg/png/webp), change, remove, oversize/wrong-type rejection, non-owner blocked, fallback renders, print stays clean.
8. `npm test` + `npm run build`.

## Open questions for the owner

- Bucket name / region / CDN base to bake into the env vars?
- Should **added** recipes (from Explore) and the **3 seeded starters** show the original's photo (plan says yes), or start photo-less?
- Any max dimension / server-side resize wanted, or store the upload as-is (≤5 MB) for v1?

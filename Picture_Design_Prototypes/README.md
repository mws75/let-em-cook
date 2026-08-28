# Recipe Pictures — Design Prototypes

Design-only mockups for adding recipe photos (stored in DigitalOcean Spaces). **No app code touched** — these are standalone HTML files to look at and choose from before we plan the implementation.

## How to view

Open `index.html` in a browser (double-click, or `start index.html` on Windows). Photos come from Unsplash; offline they fall back to a warm neutral block so layouts still read.

## The four surfaces + locked-in choices

| Prototype file | Surface | Live component | Chosen | Image controls? |
|---|---|---|---|---|
| `01-recipe-tiles.html` | Compact dashboard grid tile | `src/components/RecipeCard.tsx` | **Option B** (side thumbnail) | No — photo displays only |
| `02-recipe-cards.html` | Explore-feed card | `src/components/ExploreRecipeCard.tsx` | **Option A** (hero top) | Yes — Add / Change / Remove (owner) |
| `04-recipe-card-modal.html` | Pop-up full-recipe card | `src/components/RecipeDetailModal.tsx` | **Detail B header**, in modal | Yes — Change / Remove (owner) |
| `03-recipe-detail-page.html` | Full recipe page | `src/app/recipe/[id]/page.tsx` | **Option B** (side-by-side header) | Yes — Change / Remove (owner) |

> Terminology cleared up: the "Recipe Card" is the **modal** (`RecipeDetailModal.tsx`), which renders the full recipe like the detail page — so it reuses the detail page's side-by-side header. `ExploreRecipeCard.tsx` is the explore-feed card. The file literally named `RecipeCard.tsx` is actually the dashboard *tile*.

## Options that were considered (files keep all three for reference)

**Dashboard Tile** — `A` photo on top · **`B` side thumbnail ✓** · `C` full-bleed overlay.

**Explore Card** — **`A` hero on top ✓** · `B` split · `C` floating panel.

**Detail Page** — `A` hero banner · **`B` side-by-side header ✓** · `C` framed inset.

**Recipe Card (modal)** — reuses **Detail B**; see `04-recipe-card-modal.html` for the with-photo and empty states.

## Design principles used

- Palette/radii/type mirror `src/app/globals.css` (cream `#fdfbf7`, sage `#a8d5ba`, peach `#ffe5b4`, coral `#ffb5b5`, rounded-2xl).
- Photo carries the visual weight, so the per-category tile color steps back to a subtle accent / fallback.
- Every surface degrades to an **emoji-on-category-color** fallback when there's no photo.
- Image controls are **owner-only** and stay off the photo's focal area; empty states use a dashed drop-zone.
- Detail page keeps **print** photo-free to preserve today's clean printout.

## Next: implementation plan

With designs locked, the build breaks down into:

1. **Storage** — DigitalOcean Spaces bucket + credentials (env vars), S3-compatible upload (`@aws-sdk/client-s3`).
2. **Data** — `image_url VARCHAR` column on `ltc_recipes` (migration in `migrations/`, update `docs/DATABASE_SCHEMA.md`), threaded through the `recipes.ts` query module (numbers-not-strings boundary unaffected).
3. **API** — an authed, rate-limit-friendly upload route (owner-gated via `getAuthenticatedUserId()`) that puts the file to Spaces and patches `image_url`; a matching remove.
4. **UI** — wire the four components to the chosen layouts, each with the emoji fallback and (where applicable) owner-only Change / Remove controls.

Say the word and I'll write up the full plan.

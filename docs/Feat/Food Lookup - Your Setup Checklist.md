# Food Lookup — Your Setup Checklist (Michael)

The only thing this feature needs from you is **one free API key**. Everything
else is built. The app runs against mocked/empty results until the key is in
`.env.local`, then works live with no code changes.

**Provider decision (locked 2026-06-20):** USDA FoodData Central only, with a
homegrown natural-language parser. Nutritionix was dropped — they killed their
free/hobby tier and now start around $500–1,850/mo, which isn't worth it for a
side project. USDA is free forever, no attribution, and covers whole foods
(apples, cheese, etc.) very well. A richer NLP provider (Edamam/FatSecret) can
be slotted in later behind the same code seam if you ever want it.

---

## 1. Get the free USDA API key

- [ ] Go to https://fdc.nal.usda.gov/api-key-signup.html (api.data.gov).
- [ ] Fill in name + email. The key is emailed to you almost instantly.
- [ ] Copy the API key.

> Rate limit is 1,000 requests/hour per key — effectively non-binding for a few
> users, and our DB cache means repeat lookups don't hit USDA at all.

## 2. Add it locally

- [ ] Open `.env.local` in the project root (create it if missing).
- [ ] Add this line:

  ```
  USDA_API_KEY=your_usda_key_here
  ```

- [ ] Save. (Server-only — do not prefix with `NEXT_PUBLIC_`.)

## 3. Add it to Vercel (for deployed builds)

- [ ] Vercel → project → **Settings → Environment Variables**.
- [ ] Add `USDA_API_KEY` for **Production** (and Preview if you want PR builds to work).
- [ ] Redeploy (Vercel won't pick up new env vars on an already-built deploy).

## 4. Tell me when the key is in

- [ ] Ping me and we'll log a real apple together to confirm macros come back
      correct end-to-end.

> **No database migration needed.** Food entries ride inside the existing
> `ltc_daily_logs.entries_json` blob, and we deliberately dropped the separate
> food-cache table (USDA's limits are generous and the client computes serving
> changes locally — see the design doc §13). So the only thing standing between
> you and a working feature is the API key above.

---

### What's already built (no action needed from you)

- Natural-language parser (`src/lib/foods/parseQuery.ts`) — turns "2 large eggs",
  "100g cheddar", "1 1/2 cups rice" into a quantity + unit + food name.
- USDA provider + orchestrator (`src/lib/foods/`), with a provider abstraction so
  another source can be added later.
- `/api/foods/search` (authenticated + rate-limited, reusing the existing infra).
  Search results carry per-100g macros + serving options, so serving changes
  recompute locally in the browser — no follow-up request, no cache table.
- New **Foods** tab in the Log Food modal, reusing the existing macro form, with
  a serving dropdown and editable macro fields.
- `DailyLogEntry` extended (`kind: "food"`, `food_source`, `food_external_id`)
  and Recents de-dup updated so foods don't collide with manual entries.

### Honest limitations (so nothing surprises you)

- Great for whole foods; messier for very specific branded/prepared items
  (depends on USDA search relevance).
- If a parsed size word ("large") has no matching USDA portion, it falls back to
  the food's default serving — and every macro field stays editable.
- One food per entry (no "a sandwich and an apple" sentences).

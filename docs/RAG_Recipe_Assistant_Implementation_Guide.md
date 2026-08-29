# Recipe Assistant — Implementation Guide

> **Status:** Pivoted away from RAG to **full-context** (2026-08-28). Assistant chat route + context builder + DO-inference client built & tested. Remaining: Pro UI (Phase 3) and cleanup of the abandoned RAG ingestion path.

---

## 0. ARCHITECTURE PIVOT (2026-08-28): full-context, not RAG

**We abandoned vector RAG (the DO Knowledge Base) for this feature.** Testing the KB in the RAG Playground exposed the classic RAG failure: "which soups have chicken" returned the **union** (all soups OR all chicken recipes), because vector retrieval ranks by semantic *similarity*, not boolean logic — it cannot do "soup AND chicken," exclusions, or macro targets. That's most of this feature's use cases.

**Why full-context is the right fit here:**
- A user's recipe library is **small and structured** (~13 recipes/user today; even large libraries are a few thousand tokens). We can put **every** recipe in the model's context — no retrieval needed.
- The app **already has structured querying** (search bar + category filters). The assistant's real value is the **fuzzy, multi-constraint, reasoning** questions those can't do — the motivating example: _"I've had too much chicken and I'm tired of it — what recipes hit similar macros but have no chicken?"_ Full-context + a reasoning model handles negation, "similar macros," and "tired of X" directly.

**What this changes:**
- ❌ Retired: DO Knowledge Base, its OpenSearch cluster (delete it — it bills monthly), vector retrieval, the Spaces `rag/recipes/` docs, and the Phase 1 ingestion pipeline (`RAG_SYNC_ENABLED` → set **false**). See §14 for cleanup.
- ✅ Kept: **DO serverless inference** for generation. Now the app reads recipes straight from MySQL (`getRecipes(userId)`), builds a compact JSON context (`src/lib/assistant/recipeContext.ts`), and sends it to DO inference (`src/app/api/assistant/chat/route.ts`). Pro-gated, rate-limited.
- The sections below (§§3–8, 13) describe the **old RAG design** and are retained only for history — they are **superseded** by this section and §5-new below.

### Current architecture (as built)
```
user question → POST /api/assistant/chat
  → auth + Pro-gate (plan_tier === "pro") + enforceAiRateLimit
  → getRecipes(userId)                              (all the user's recipes, one query)
  → buildRecipeContext(recipes)                     (compact JSON, token-budgeted)
  → DO inference chat.completions (ASSISTANT_SYSTEM_PROMPT + context + history + question)
  → { answer }
```
- **Files (new):** `src/lib/assistant/recipeContext.ts` (+ test), `src/lib/doInference.ts`, `ASSISTANT_SYSTEM_PROMPT` in `src/lib/prompts.ts`, `src/app/api/assistant/chat/route.ts`.
- **Env needed:** `DO_INFERENCE_BASE_URL` (`https://inference.do-ai.run/v1`), `DO_INFERENCE_API_KEY`, `DO_INFERENCE_MODEL`. (No KB/retrieve vars.)
- **Cost/scale:** typical user ≈ a few thousand context tokens/message (fractions of a cent, Pro-gated). `buildRecipeContext` caps at ~60k tokens and drops oldest recipes for rare huge libraries; a SQL pre-filter is the future fallback if that ever bites.
- **Gotcha:** paid tier is `plan_tier === "pro"` (NOT "premium" — the SKILL.md/CLAUDE.md context is wrong; the Stripe webhook writes "pro"/"free").

---

> **Historical (pre-pivot) status:** Phase 1 RAG ingestion was built & tested behind `RAG_SYNC_ENABLED`; it is now superseded — see §14 cleanup.
> **Author:** Michael (drafted with Claude)
> **Last updated:** 2026-08-28
> **Feature:** A per-user chat assistant that answers questions grounded in the user's *own* saved recipes — e.g. _"I have chicken and lemon, what can I make?"_ or _"Help me pick recipes to hit 120g protein this week using chicken and fish."_

---

## Decisions locked (2026-08-28)

These were decided with Michael; the doc below reflects them.

1. **Access tier:** **Pro-only** — gate behind `plan_tier === 'premium'`; free users get an `UpgradePrompt`.
2. **Generation model:** **DigitalOcean serverless inference** (OpenAI-compatible, `https://inference.do-ai.run`) — Michael already pays $25/mo + $0.40/M tokens for it, so the whole RAG path stays on one vendor and one bill. (Retrieval is DO KB; generation is DO inference; OpenAI is **not** used for this feature.)
3. **Index freshness:** **Daily auto-index** on the Spaces folder for the MVP; upgrade to debounced indexing jobs later if needed.
4. **Macro-optimization queries:** **Pure RAG first** (over-retrieve + let the model reason), evaluate quality, add a SQL pre-filter only if answers are flaky.
5. **Orchestration home:** **Inside the existing Vercel Next.js app** — the DO App Platform app from the starter kit is left unused/decommissioned; DO is used purely as the KB (retrieve) + inference backend.

---

## 1. Product goal

Give each user a chat box that reasons over **their** recipe library (ingredients, macros, times, tags). Two broad query shapes must work:

1. **Discovery / lookup (RAG-native):** "What can I make with chicken and lemon?", "Which of my recipes are under 500 cal and high protein?", "Show me quick weeknight dinners." → semantic + keyword retrieval over recipe text.
2. **Planning / optimization (RAG + reasoning):** "Pick 4 recipes to get me to 120g protein this week using mostly chicken and fish." → retrieve a candidate set, then let the model reason and do arithmetic over the macros in context. Pure vector search will **not** solve this alone (see §8).

**Hard requirement: strict per-user isolation.** A user must never retrieve another user's recipes. This single constraint drives the entire architecture (§4).

---

## 2. Why DigitalOcean GenAI (Gradient) Knowledge Bases

We're already committed to the DO GenAI/RAG stack (the starter kit is deployed). Relevant facts established during research:

- **Knowledge Bases** store source documents in a **DO Spaces bucket** and index them into a managed **OpenSearch** vector store. We already use DO Spaces for recipe photos (`src/lib/storage.ts`) — same bucket, same credentials, same SDK.
- Data sources can be a **Spaces bucket or folder**; **auto-indexing** re-indexes changes on a recurring schedule (daily / weekly / manual).
- The **Retrieve API** (`POST /v1/<kb-uuid>/retrieve`, authenticated with a DO API token scoped `GenAI:read`) returns the top-k relevant chunks **with metadata filters** — operators include `equals`, `starts_with`, `file_id` wildcards, combined via `and_all` / `or_all`. An `alpha` param blends lexical↔semantic (0=keyword, 1=semantic).
- A managed **Agent** exposes an **OpenAI-compatible** endpoint (`$AGENT_ENDPOINT/api/v1/chat/completions`, Bearer access key).

### ⚠️ Critical design decision: use **Retrieve-then-Generate**, NOT the managed Agent for chat

A DO **Agent** attached to the KB retrieves across the **entire** KB on every turn, with **no per-request user filter**. In a multi-tenant SaaS that means **every user would see every other user's recipes** — an unacceptable data leak.

**Therefore the chat flow is:**

```
user question
  → our /api route (auth → resolve userId)
  → DO Retrieve API  (filter: this user's recipes ONLY)   ← isolation enforced here
  → chunks + question → LLM (generation)
  → answer + cited recipes back to client
```

We control the filter server-side, so a user can only ever retrieve their own documents. The managed Agent may still be useful later for a **single-tenant** internal tool, but not for the user-facing feature.

---

## 3. Where does the sync process live? (the question you asked)

You asked whether to (a) crawl recipes in a **separate process/app** (DO Functions "lambda", Vercel equivalent), or (b) do it in the **background of the website** after load. Recommendation:

**Neither of the extremes. Do event-driven sync inside the existing Next.js API layer, plus a nightly reconcile cron. No separate app needed for the MVP.**

Reasoning:

- **Client-side background push (option b) is out.** It's unreliable (user closes the tab), can't hold Spaces/DO credentials safely, and gives us no server-side control or retry. Never push to Spaces from the browser.
- **A dedicated crawler app (option a) is premature.** Every recipe write already flows through our `/api` route handlers. The moment a recipe changes we already have the data and a server context — so we write the document to Spaces **right there**. That's simpler, fresher, and cheaper than a separate service polling PlanetScale.
- **We still want a safety net.** A **nightly cron** reconciles Spaces against the DB (catches missed writes, backfills, deletes orphans). Since the marketing site/app runs on **Vercel**, use **Vercel Cron Jobs** hitting a protected route. (Equivalents if we ever move the worker off Vercel: **DO Functions** = the "lambda" you were thinking of; **DO App Platform scheduled job/worker**.)

| Approach | Freshness | Infra cost | Verdict |
|---|---|---|---|
| Client-side after load | Poor / racy | none | ❌ reject |
| Separate crawler service | Stale (poll interval) | new app to run | ⏳ only if writes get heavy |
| **On-write sync in API routes** | **Real-time** | **none (reuse app)** | ✅ **primary** |
| Nightly Vercel Cron reconcile | Daily | ~free | ✅ **safety net** |

So: **on-write sync (primary) + nightly reconcile cron (safety net)**, and let DO **auto-index daily** turn the Spaces docs into vectors (upgrade to a triggered indexing job later if we need near-real-time — see §6).

---

## 4. Data model: one document per recipe, foldered by user

### Object layout in Spaces

Store one text document **per recipe**, namespaced by user, in the existing Spaces bucket:

```
rag/recipes/{userId}/{recipeId}.md
```

- **One recipe = one document = ~one chunk.** Each recipe is self-contained (title, ingredients, macros, tags, times), which is ideal for retrieval — a single chunk fully answers "what's in this recipe."
- **Per-user folder = the isolation key.** At retrieval we filter `file_id starts_with "rag/recipes/{userId}/"`. No custom metadata infra required — the path *is* the tenant boundary.
- Kept under a `rag/` prefix so it doesn't collide with the existing `recipes/{recipeId}/…` photo objects. Point the KB data source at the `rag/recipes/` folder specifically.

### Document format (Markdown, macros embedded as text)

Embed the **numeric macros as text** so the model can read and compute over them. Example `rag/recipes/42/1337.md`:

```markdown
# Lemon Garlic Chicken

- Recipe ID: 1337
- Category: Dinner
- Servings: 4
- Tags: high-protein, quick, gluten-free
- Active time: 15 min | Total time: 35 min

## Macros (per serving)
- Calories: 420
- Protein: 38 g
- Fat: 18 g
- Carbs: 12 g
- Sugar: 3 g

## Ingredients
- 1.5 lb chicken breast
- 2 lemon (juiced)
- 4 clove garlic (minced)
- 2 tbsp olive oil
- Salt, pepper

## Instructions
1. Season chicken...
2. Sear...
```

Why Markdown over raw JSON: it chunks/embeds cleanly, keeps ingredient names and macro numbers as natural language the retriever and generator both handle well, and stays human-inspectable in the DO console. (A machine-readable macros block can also be duplicated in JSON at the bottom if we later want the generator to parse it deterministically.)

### Source of truth for the document

Build the doc from the canonical `Recipe` object (`src/types/types.ts:34-74`). Field names to use (⚠️ note the non-obvious ones):

| Concept | Field on `Recipe` |
|---|---|
| id | `recipe_id` (number, **not** `id`) |
| owner | `user_id` (number) |
| title | `name` (**not** `title`) |
| ingredients | `ingredients_json: Ingredients[]` — `{name, quantity, unit, prep?, optional?, section}` |
| macros | `per_serving_calories`, `per_serving_protein_g`, `per_serving_fat_g`, `per_serving_carbs_g`, `per_serving_sugar_g` (numbers) |
| servings | `servings` |
| tags | `tags: string[]` (DB column `tags_json`) |
| times | `time.active_min`, `time.total_time` |
| category | `category` (string) |
| emoji | `emoji` |

Fetch with the existing `getRecipes(userId: number): Promise<Recipe[]>` (`src/lib/database/recipes.ts:119`).

---

## 5. Implementation — code changes

Follows the project's standard feature shape: **storage helper → sync hooks in mutation routes → cron/backfill → retrieval+chat route → client**. No new DB migration is strictly required for the MVP (Spaces + DO KB hold the derived data), though see §9 for an optional sync-tracking table.

### 5.1 New: `src/lib/rag/recipeDocument.ts` — serialize a recipe to Markdown

Pure function, unit-testable (co-locate `recipeDocument.test.ts` per project convention):

```ts
import type { Recipe } from "@/types/types";

/** Build the Markdown RAG document body for a single recipe. */
export function buildRecipeDocument(recipe: Recipe): string { /* ... */ }

/** Spaces object key for a recipe's RAG doc. */
export function recipeDocumentKey(userId: number, recipeId: number): string {
  return `rag/recipes/${userId}/${recipeId}.md`;
}
```

### 5.2 Extend `src/lib/storage.ts` — write/delete RAG docs

Reuse the existing `getSpaces()` client and `getBucket()`. Add:

```ts
// Uploads a recipe's RAG document (private, text/markdown). Reuses S3Client v3 + PutObjectCommand.
export async function putRecipeDocument(userId: number, recipeId: number, body: string): Promise<void>;

// Deletes a recipe's RAG document (best-effort, never throws — mirror deleteObjectByUrl).
export async function deleteRecipeDocument(userId: number, recipeId: number): Promise<void>;
```

Notes:
- Unlike photos, RAG docs should **not** be `public-read` — set no public ACL (contents are the KB's job to read, not the browser's). The KB reads the bucket with our credentials.
- `ContentType: "text/markdown"`.

### 5.3 New: `src/lib/rag/sync.ts` — orchestration seam ✅ built

**Fetch-based design (as built):** callers pass only `(userId, recipeId)`; the sync re-reads the canonical row via `getRecipeById` and writes the doc. This keeps every call site trivial and guarantees the doc always matches what's stored, regardless of how the row was created (create / update / copy / seed). The small extra DB read per write is negligible (writes are infrequent).

```ts
export async function syncRecipeToRag(userId: number, recipeId: number): Promise<void>;   // fetch → build → put
export async function removeRecipeFromRag(userId: number, recipeId: number): Promise<void>; // best-effort delete
export async function syncRecipesToRag(userId: number, recipeIds: number[]): Promise<void>; // copy/seed (many)
export async function syncAllRecipesForUser(userId: number): Promise<number>;               // backfill/reconcile (one DB read)
```

**Gated behind `RAG_SYNC_ENABLED`** — all four no-op unless `process.env.RAG_SYNC_ENABLED === "true"`. This lets Phase 1 ship and merge safely **without writing anything to Spaces** until the KB is provisioned and we deliberately flip the flag.

### 5.4 Hook the sync into mutation routes (fire-and-forget) ✅ built

After each successful DB mutation, sync is called **without blocking or breaking the user's request** (errors swallowed + logged):

| Route | Call added |
|---|---|
| `create-recipe-step-two/route.ts` (insert **and** update) | `syncRecipeToRag(userId, recipe_id)` |
| `recipes/[id]/route.ts` `DELETE` | `removeRecipeFromRag(userId, recipeId)` |
| `recipes/[id]/add/route.ts` (copy) | `syncRecipeToRag(userId, newRecipeId)` |
| `auth.ts` `createUserAndSyncMetadata` (seed) | `syncRecipesToRag(userId, seeded)` |

```ts
syncRecipeToRag(userId, recipe_id).catch((e) => console.error("[rag] sync failed", e));
```

Called from the **route handlers / auth layer**, not the DB module, so `recipes.ts` stays pure SQL.

### 5.5 Backfill + nightly reconcile

- **Backfill route** `src/app/api/admin/rag-backfill/route.ts` (✅ built): `POST`, protected by `CRON_SECRET` (Bearer or `x-cron-secret`), requires `RAG_SYNC_ENABLED=true`. Selects every active user who owns a recipe (`ltc_recipes ⨝ ltc_users WHERE is_deleted = 0`), then `syncAllRecipesForUser` for each; returns `{ usersProcessed, recipesSynced }`. Idempotent — safe to re-run.
  > **Why a route, not `scripts/rag-backfill.ts`:** the project has no TS script runner configured (no `tsx`/`ts-node`), so a standalone script isn't runnable without new tooling. A protected route runs in the Next.js runtime with full env/DB/storage access and reuses the infra the nightly cron will use.
- **Nightly reconcile** (Phase 4 — `src/app/api/cron/rag-reconcile/route.ts`, `CRON_SECRET`-protected, scheduled via `vercel.json`): re-sync recently-modified recipes and delete orphaned docs. Safety net for any missed on-write sync.

### 5.6 New: `src/lib/rag/retrieve.ts` — DO Retrieve API client

```ts
// POST {DO_GENAI_RETRIEVE_BASE}/v1/{DO_RAG_KB_UUID}/retrieve
// Auth: Bearer {DO_GENAI_API_TOKEN}  (token needs GenAI:read scope)
export async function retrieveForUser(userId: number, query: string, opts?: {
  numResults?: number;   // default ~8–12 (over-retrieve for planning queries, §8)
  alpha?: number;        // default 0.6 (balanced hybrid)
}): Promise<RetrievedChunk[]>;
```

Request body shape (confirm exact field names against the live KB API when building):

```jsonc
{
  "query": "chicken and lemon dinner",
  "num_results": 10,
  "alpha": 0.6,
  "filters": {
    "and_all": [
      { "key": "file_id", "operator": "starts_with", "value": "rag/recipes/42/" }
    ]
  }
}
```

The `starts_with "rag/recipes/{userId}/"` filter is the **isolation guarantee** — always inject it server-side from the authenticated `userId`; never accept it from the client.

### 5.7 New: `src/app/api/assistant/chat/route.ts` — retrieve-then-generate

Standard project route shape (`src/app/api/create-recipe/route.ts` is the template):

```ts
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();          // auth gate FIRST
    await enforceAiRateLimit(userId, "assistant-chat");     // 60/min per user
    const { message, history } = await request.json();      // validate

    const chunks = await retrieveForUser(userId, message);  // isolation via filter
    const context = formatChunksForPrompt(chunks);          // recipe docs as context

    const completion = await doInference.chat.completions.create({ // DO serverless inference
      model: process.env.DO_INFERENCE_MODEL!,               // e.g. a Llama / Qwen / Claude model on DO
      messages: [
        { role: "system", content: ASSISTANT_SYSTEM_PROMPT }, // add to src/lib/prompts.ts
        ...(history ?? []),
        { role: "user", content: `${context}\n\nQuestion: ${message}` },
      ],
      temperature: 0.3,
    });

    return NextResponse.json({
      answer: completion.choices[0].message.content,
      sources: chunks.map((c) => ({ recipeId: c.recipeId, name: c.name })),
    }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: "Too many requests. Please wait a bit and try again." }, { status: 429 });
    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
```

**Generation model — DO serverless inference (decided).** DO's inference API is **OpenAI-compatible**, so we instantiate a second OpenAI-SDK client pointed at DO in a new `src/lib/doInference.ts`:

```ts
import OpenAI from "openai";
// DO serverless inference is OpenAI-compatible; only the base URL + key differ.
export const doInference = new OpenAI({
  baseURL: process.env.DO_INFERENCE_BASE_URL, // "https://inference.do-ai.run/v1"
  apiKey: process.env.DO_INFERENCE_API_KEY,   // DO model access key (Bearer)
});
```

This keeps the whole RAG path on DigitalOcean (retrieval on the KB, generation on inference) and on the plan Michael already pays for. Pick a model from DO's catalog (`DO_INFERENCE_MODEL`) — DO serves 70+ models (Llama, Qwen, DeepSeek, Claude, GPT) behind that one base URL, so the model is swappable via env without code changes. Keep `handleOpenAIError` — it handles any `OpenAI.APIError`, so it works for the DO client too. Note the existing `openai` client (env `OPENAI`) is **not** used by this feature.

**System prompt** (add to `src/lib/prompts.ts`): instruct the model to answer **only** from the provided recipes, cite recipe names/ids, say so when nothing matches, and — for macro-target questions — sum the per-serving macros across the recipes it proposes and show the running total.

### 5.8 Client UI

- A chat panel on `/dashboard` (or a dedicated `/dashboard/assistant`). `react-hot-toast` for errors, existing design tokens.
- POST to `/api/assistant/chat`, render `answer` + clickable `sources` that link to `/recipe/[id]`.
- **Pro-only (decided):** gate behind `plan_tier === 'premium'`. Enforce **server-side** in the chat route (fetch the user via `getUserById(userId)` / `getAuthenticatedUser()` and return 403 for non-premium) — don't rely on hiding the UI. Free users see an `UpgradePrompt` and the chat panel is hidden/locked.

---

## 6. Indexing strategy (Spaces → vectors)

- **MVP:** enable **auto-index on a daily schedule** for the `rag/recipes/` data source. Docs written today are searchable tomorrow. Simple, zero code.
- **Near-real-time (phase 2):** after an on-write sync, POST a **create-indexing-job** (`https://api.digitalocean.com/v2/gen-ai/indexing_jobs`, or `create_indexing_job()` via the `pydo`/API) scoped to the KB. **Debounce** it (recipes get edited in bursts) — e.g. coalesce to at most one job every N minutes, or index only the changed data source. Watch DO indexing cost/quota before making this aggressive.
- **Chunking:** since one recipe ≈ one chunk, default chunking is fine. If recipes with long instructions fragment, tune the data source's chunk size. Retrieval `alpha` ≈ 0.6 (balanced), `num_results` 8–12.

---

## 7. Environment variables (add)

Reuse existing `DO_SPACES_*` (bucket, key, secret, endpoint, region) — the RAG docs live in the **same bucket**. New:

| Var | Purpose |
|---|---|
| `DO_RAG_KB_UUID` | Knowledge base UUID to retrieve from |
| `DO_GENAI_API_TOKEN` | DO API token, scoped `GenAI:read` (+ write if we trigger indexing jobs) |
| `DO_GENAI_RETRIEVE_BASE` | Base URL host for the retrieve endpoint (confirm from KB page) |
| `DO_INFERENCE_BASE_URL` | `https://inference.do-ai.run/v1` — DO serverless inference (OpenAI-compatible) |
| `DO_INFERENCE_API_KEY` | DO model access key for inference (Bearer) |
| `DO_INFERENCE_MODEL` | Which DO-hosted model to generate with (swappable) |
| `RAG_SYNC_ENABLED` | `"true"` to turn on recipe→Spaces ingestion. Off/unset = all sync is a no-op (safe default). |
| `CRON_SECRET` | Shared secret to auth the backfill + Vercel Cron reconcile routes |

---

## 8. Handling the two query types (important nuance)

- **Discovery queries** ("chicken and lemon") map perfectly to hybrid retrieval — the ingredient names are in the doc text. Works out of the box.
- **Macro-optimization queries** ("hit 120g protein this week with chicken and fish") are an **optimization problem**, not a retrieval problem. Strategy:
  1. **Over-retrieve** a candidate set (e.g. `num_results` 10–15) so enough chicken/fish recipes with their macros land in context.
  2. Let the model **reason and sum** over the macros (system prompt instructs it to show totals).
  3. **Deferred — hybrid SQL pre-filter (v2 only, if needed):** we ship pure RAG first (decided). If macro-target answers prove flaky in testing, narrow candidates with a plain **SQL query** over `ltc_recipes` (e.g. WHERE ingredients contain chicken/fish, high protein) using existing DB helpers, then hand those to the model — more deterministic than trusting vector recall for a numeric target. Don't build this up front.

> Reality check: RAG makes the recipes *available* to the model; it does **not** do the math or guarantee an optimal combination. Set UX expectations as "smart suggestions," and verify totals in the response.

---

## 9. Optional: sync-tracking column/table

Not required for MVP (Spaces is the derived store). If we want observability/debugging of sync state, add a lightweight column or table (migration in `migrations/`, update `docs/DATABASE_SCHEMA.md`):

- `ltc_recipes.rag_synced_on DATETIME NULL` — set on successful sync; nightly reconcile targets `rag_synced_on < modified_on OR NULL`. Cheapest option, gives us a precise reconcile query.

---

## 10. Security & cost checklist

- ✅ **Isolation:** every retrieve injects the `file_id starts_with "rag/recipes/{userId}/"` filter from the **authenticated** `userId`. Client-supplied filters are ignored. Add a test asserting user A cannot retrieve user B's docs.
- ✅ **Auth + rate limit:** the chat route gates with `getAuthenticatedUserId()` and `enforceAiRateLimit(userId, "assistant-chat")` **before** spending money (project rule for any AI route).
- ✅ **RAG docs are private** in Spaces (no `public-read` ACL), unlike photos.
- ✅ **Cron route** protected by `CRON_SECRET`.
- 💲 **Cost:** each chat message = 1 retrieve + 1 LLM completion. Gate behind Pro tier and/or a lower per-user rate limit than the recipe pipeline. Debounce indexing jobs.
- 🔑 **DO API token** stored only server-side in env; never shipped to the client.

---

## 11. Phased rollout

**Phase 0 — Provision (console):** create the KB pointed at Spaces `rag/recipes/`; enable daily auto-index; create the DO API token (`GenAI:read`). Confirm the retrieve endpoint URL + request/filter JSON in the **RAG Playground**.

**Phase 1 — Ingestion:** ✅ **DONE (2026-08-28).** `recipeDocument.ts` (+ 8 passing tests), `storage.ts` put/delete, `rag/sync.ts` (gated by `RAG_SYNC_ENABLED`), sync wired into create/update/delete/copy/seed, and `admin/rag-backfill` route. Typechecks clean; full suite green (124 passing; 3 pre-existing Clerk/Jest ESM suite-load failures unrelated to this work). **Not yet activated** — flip `RAG_SYNC_ENABLED=true` after the KB exists, then POST the backfill route.

**Phase 2 — Retrieval + chat:** `rag/retrieve.ts`, `/api/assistant/chat`, system prompt, isolation test. Validate answers in the RAG Playground first, then via the route.

**Phase 3 — UI:** dashboard chat panel, sources linking to `/recipe/[id]`, tier gating.

**Phase 4 — Hardening:** nightly Vercel Cron reconcile, optional near-real-time indexing job trigger (debounced), optional SQL pre-filter for macro-optimization queries, `rag_synced_on` observability.

---

## 12. Decisions (resolved) — see "Decisions locked" at top

| # | Question | Decision |
|---|---|---|
| 1 | Free or Pro-only? | **Pro-only** — server-enforced `plan_tier === 'premium'`, `UpgradePrompt` for free users |
| 2 | Generation model | **DO serverless inference** (`https://inference.do-ai.run`, OpenAI-compatible); already-paid capacity, one vendor. Not OpenAI. |
| 3 | Indexing freshness | **Daily auto-index** for MVP; debounced indexing jobs deferred to Phase 4 |
| 4 | Macro-optimization | **Pure RAG first**, evaluate; SQL pre-filter deferred (only if flaky) |
| 5 | Orchestration home | **Vercel Next.js app**; DO used only as KB + inference; starter-kit App Platform app decommissioned |

**Still to confirm during build (not blockers):**
- Exact retrieve endpoint host + request/filter JSON — verify in the DO **RAG Playground** (docs describe the operators but not the full schema).
- Which specific DO-hosted model to set as `DO_INFERENCE_MODEL` (quality vs cost trade-off across DO's catalog).

---

## 13. Phase 0 — provisioning the Knowledge Base (click-path)

> DO recently rebranded this area as the **Gradient AI Platform**; the KB lives under **Data Services → Knowledge Bases**. Labels below match the console as of 2026-08. This is a one-time, console-only setup — no code.

### Prerequisites
- The **Spaces bucket already exists** (we use it for recipe photos — `DO_SPACES_BUCKET`). The KB will read the **`rag/recipes/`** folder in that same bucket.
- **At least one document must exist in `rag/recipes/` before the KB can index anything.** So the order is: (1) set `RAG_SYNC_ENABLED=true` + `CRON_SECRET` in prod env, (2) `POST /api/admin/rag-backfill` to write the docs, **then** (3) create the KB below. (Alternatively create the KB first and run the backfill after — but you'll then need to trigger a manual re-index so it picks the docs up.)

### A. Create the Knowledge Base
1. **Control Panel → Data Services → Knowledge Bases → Create Knowledge Base** (top-right).
2. **Embeddings model:** open **Choose your embeddings model** and pick one. ⚠️ **This cannot be changed later** — pick a general-purpose text embedding model and keep it.
3. **Add data source → Pull from a Spaces bucket or folder.** In the picker, expand our bucket with **+** and select the **`rag/recipes/`** folder (not the whole bucket — that would also index the photo objects).
4. *(Optional)* **Advanced Options → chunking strategy.** Our docs are ~one recipe each; the default is fine. Leave it unless retrieval later looks fragmented.
5. **Add selected data source → Next step: Configure database.**
6. **OpenSearch database options:** **Use existing** if the RAG starter kit already created one (reuse it to avoid a second monthly cluster charge); otherwise **Create new**, pick a **region** close to the app, and select the **VPC**.
7. **Next step: Review and create.** **Name** it `letemcook-recipes` (3–63 chars, alphanumeric/dashes/periods), assign it to the **`rag_assistant`** project, add a tag, **Create knowledge base.** Indexing of whatever is already in `rag/recipes/` starts automatically — watch the **Activity** tab.

### B. Turn on daily auto-indexing
1. Open the KB → **Data Sources** tab → the `rag/recipes/` source.
2. Enable **Auto-index** and set the schedule to **Daily** (options are typically Daily / Weekly / Manual). This re-indexes new/changed docs each day — matching the "daily auto-index for MVP" decision.
   > If a simple toggle isn't exposed, the fallback is a scheduled DO Function calling the Create-Indexing-Job API on a cron — but only wire that up in Phase 4 if needed.
3. To index on demand any time, use **Index now / Re-index** on this tab (do this once right after the first backfill if you created the KB before running it).

### C. Grab the values the app needs
- **KB UUID** — open the KB in the console; the UUID is in the page **URL** (`.../knowledge-bases/<uuid>`) and on the **Overview/Settings** tab. → set as **`DO_RAG_KB_UUID`**.
- **DO API token** — **Control Panel → API → Tokens → Generate New Token**, scoped with **GenAI read** (add write too if we later trigger indexing jobs from code). Copy it once. → set as **`DO_GENAI_API_TOKEN`**.
- **Retrieve endpoint base** — confirm the host for `POST /v1/<kb-uuid>/retrieve` from the KB's API/usage panel. → set as **`DO_GENAI_RETRIEVE_BASE`**.
- **Inference (Phase 2)** — for generation: **Agent Platform / Inference → model access keys → Create key** → **`DO_INFERENCE_API_KEY`**; base `https://inference.do-ai.run/v1` → **`DO_INFERENCE_BASE_URL`**; chosen model → **`DO_INFERENCE_MODEL`**.

### D. Smoke-test before writing any app code
Open the KB → **RAG Playground**, type _"what can I make with chicken and lemon?"_, and confirm it retrieves your recipe chunks with sources. This also reveals the **exact retrieve request/filter JSON** to mirror in `src/lib/rag/retrieve.ts` (Phase 2), including the `file_id starts_with "rag/recipes/{userId}/"` filter for per-user isolation.

### Checklist
- [ ] `RAG_SYNC_ENABLED=true`, `CRON_SECRET` set in prod env
- [ ] Backfill run (`POST /api/admin/rag-backfill`) — docs visible in Spaces `rag/recipes/`
- [ ] KB created against `rag/recipes/`, first index succeeded (Activity tab)
- [ ] Daily auto-index enabled
- [ ] `DO_RAG_KB_UUID`, `DO_GENAI_API_TOKEN`, `DO_GENAI_RETRIEVE_BASE` captured
- [ ] RAG Playground returns relevant recipes

---

## Appendix — files to create / touch

**New:**
- ✅ `src/lib/rag/recipeDocument.ts` (+ `recipeDocument.test.ts`) — built
- ✅ `src/lib/rag/sync.ts` — built
- ✅ `src/app/api/admin/rag-backfill/route.ts` — built (replaces the planned `scripts/rag-backfill.ts`)
- `src/lib/rag/retrieve.ts` — Phase 2
- `src/lib/doInference.ts` — DO serverless inference client (OpenAI SDK, DO base URL) — Phase 2
- `src/app/api/assistant/chat/route.ts` — Phase 2
- `src/app/api/cron/rag-reconcile/route.ts` — Phase 4
- Client chat component under `src/components/` — Phase 3

**Modified:**
- ✅ `src/lib/storage.ts` — `putRecipeDocument`, `deleteRecipeDocument` — built
- ✅ Recipe create/update/delete/copy routes + `auth.ts` seed — call sync — built
- `src/lib/prompts.ts` — `ASSISTANT_SYSTEM_PROMPT` (Phase 2)
- `vercel.json` — cron schedule (Phase 4)
- `.env` / env docs — `RAG_SYNC_ENABLED` (now) + DO GenAI/inference vars (Phase 2)
- `docs/API_REFERENCE.md` — document the new endpoints
- _(optional)_ `migrations/00X_rag_sync.sql` + `docs/DATABASE_SCHEMA.md` — `rag_synced_on`

---

## 14. Post-pivot cleanup (RAG path is dead)

The full-context assistant does **not** use any of the Phase 1 RAG ingestion. To avoid confusion and cost:

**Operator (console/env) — do now:**
- [ ] **Delete the DigitalOcean Knowledge Base and its OpenSearch cluster** (the cluster bills monthly).
- [ ] Set **`RAG_SYNC_ENABLED=false`** (or remove it) in prod so recipe writes stop uselessly pushing files to Spaces.
- [ ] *(Optional)* delete the `rag/recipes/` objects already in the Spaces bucket.
- [ ] Add the **`DO_INFERENCE_*`** env vars (base URL, key, model) so the chat route works.

**Code cleanup — safe to remove (currently gated off, harmless):**
- `src/lib/rag/sync.ts`, `src/lib/rag/recipeDocument.ts` (+ test), `src/app/api/admin/rag-backfill/route.ts`
- `putRecipeDocument` / `deleteRecipeDocument` in `src/lib/storage.ts`
- The `syncRecipeToRag` / `removeRecipeFromRag` / `syncRecipesToRag` calls in the recipe create/update/delete/copy routes and `auth.ts`

> Left in place for now (inert with `RAG_SYNC_ENABLED` unset). Remove in a dedicated cleanup commit once the full-context assistant is confirmed working end-to-end, so the diff that rips it out is easy to review.

### Assistant build status (post-pivot)
- ✅ `src/lib/assistant/recipeContext.ts` (+ `recipeContext.test.ts`, 5 tests) — built
- ✅ `src/lib/doInference.ts` — built
- ✅ `ASSISTANT_SYSTEM_PROMPT` in `src/lib/prompts.ts` — built
- ✅ `src/app/api/assistant/chat/route.ts` — built (Pro-gated, rate-limited, full-context)
- ⏳ Client chat UI (Phase 3) — dashboard panel, Pro gating/`UpgradePrompt`
- ⏳ `docs/API_REFERENCE.md` — document `POST /api/assistant/chat`

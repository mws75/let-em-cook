# WIP — Recipe Assistant (full-context chat)

> **Handoff note — 2026-08-28.** Where we are, so we can pick up cleanly next session.
> Full design doc: `docs/RAG_Recipe_Assistant_Implementation_Guide.md` (see §0 pivot + §14 cleanup).
> Branch: `feat-rag`. **Nothing is committed yet** — all work below is in the working tree.

---

## What we're building

A **Pro-only chat assistant** that answers questions about a user's *own* saved recipes — the fuzzy, reasoning-heavy questions the existing search bar/filters can't do. Motivating example:
> _"I've had too much chicken and I'm tired of it — what recipes hit similar macros but have no chicken?"_

## The big decision this session: we dropped RAG for full-context

We first built a RAG pipeline on DigitalOcean's Knowledge Base (recipes → Spaces docs → vector index → retrieval). Testing it exposed the classic RAG failure: **"which soups have chicken" returned the union (soups OR chicken), not the intersection** — vector search ranks by similarity, it can't do boolean AND / exclusions / macro targets, which is most of this feature.

**Pivot:** a user's recipe library is small + structured, so we just put **all** their recipes into the model's context — no retrieval. Generation runs on **DigitalOcean serverless inference** (OpenAI-compatible). Precise, simple, and it nails the query types above.

Current flow:
```
POST /api/assistant/chat
  → auth → Pro-gate (plan_tier === "pro") → enforceAiRateLimit
  → getRecipes(userId) → buildRecipeContext() (compact JSON, token-budgeted)
  → DO inference (ASSISTANT_SYSTEM_PROMPT + context + history + question)
  → { answer }
```

---

## Where we left off (built & tested ✅)

All typecheck clean; new unit tests pass (full suite: 129 pass; 3 pre-existing Clerk/Jest ESM suite-load failures are unrelated to this work).

- `src/lib/assistant/recipeContext.ts` (+ `recipeContext.test.ts`, 5 tests) — serializes a user's recipes to compact JSON, caps ~60k tokens, drops oldest if a library is huge.
- `src/lib/doInference.ts` — lazy DO serverless-inference client (`getDoInference()`, `getDoInferenceModel()`).
- `src/lib/prompts.ts` — added `ASSISTANT_SYSTEM_PROMPT`.
- `src/app/api/assistant/chat/route.ts` — the chat endpoint (auth, **Pro-gate**, rate-limit, full-context, error ladder).

**Gotcha found & recorded:** paid tier is `plan_tier === "pro"` (NOT "premium" — the SKILL.md/CLAUDE.md context is wrong; the Stripe webhook writes "pro"/"free"). Saved to memory.

---

## What's left

### A. Operator actions (env / DO console) — BLOCKS testing
- [ ] Add env vars in Vercel: `DO_INFERENCE_BASE_URL=https://inference.do-ai.run/v1`, `DO_INFERENCE_API_KEY` (DO model access key), `DO_INFERENCE_MODEL` (start with **GPT-oss-120b** — GPT-4o mini was erroring in the DO Playground; model is swappable anytime).
- [ ] Smoke-test the route once vars are set (curl the chicken/macros question) and confirm answers are good before building UI.

### B. RAG cleanup (retire the abandoned path)
- [ ] **Delete the DO Knowledge Base + its OpenSearch cluster** (the cluster bills monthly).
- [ ] Set **`RAG_SYNC_ENABLED=false`** in prod (stops useless Spaces writes on every recipe save).
- [ ] *(Optional)* delete the `rag/recipes/` objects already in the Spaces bucket.
- [ ] **Code removal (dedicated cleanup commit, once assistant is confirmed working):** delete `src/lib/rag/*` (`sync.ts`, `recipeDocument.ts` + test), `src/app/api/admin/rag-backfill/route.ts`, `putRecipeDocument`/`deleteRecipeDocument` in `src/lib/storage.ts`, and the `syncRecipeToRag`/`removeRecipeFromRag`/`syncRecipesToRag` calls in the recipe create/update/delete/copy routes + `auth.ts`. (All inert now with `RAG_SYNC_ENABLED` off — safe to leave until then.)

### C. Phase 3 — the UI (not started)
- [ ] Pro-gated chat panel on `/dashboard` that POSTs to `/api/assistant/chat`; render `answer`, keep a short `history`.
- [ ] `UpgradePrompt` for free users (mirror existing upgrade UX).
- [ ] Loading/error states via `react-hot-toast`.

### D. Docs / polish
- [ ] Document `POST /api/assistant/chat` in `docs/API_REFERENCE.md`.
- [ ] Move `docs/RAG_Recipe_Assistant_Implementation_Guide.md` out of "in progress" framing once shipped (consider renaming to `Recipe_Assistant_*`).

---

## Next session: start here
1. Confirm the `DO_INFERENCE_*` env vars are set, then **smoke-test `/api/assistant/chat`** with a real question.
2. If answers look good → **build the Phase 3 chat UI**.
3. Then do the **RAG code-removal commit** (section B).

## Uncommitted files this session
**New:** `src/lib/assistant/recipeContext.ts` (+test), `src/lib/doInference.ts`, `src/app/api/assistant/chat/route.ts`, `src/lib/rag/*` (to be removed), `src/app/api/admin/rag-backfill/route.ts` (to be removed), `docs/RAG_Recipe_Assistant_Implementation_Guide.md`, this file.
**Modified:** `src/lib/prompts.ts`, `src/lib/storage.ts`, `src/lib/auth.ts`, `src/app/api/create-recipe-step-two/route.ts`, `src/app/api/recipes/[id]/route.ts`, `src/app/api/recipes/[id]/add/route.ts`.

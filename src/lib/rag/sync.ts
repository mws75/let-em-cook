import { getRecipeById, getRecipes } from "@/lib/database/recipes";
import { putRecipeDocument, deleteRecipeDocument } from "@/lib/storage";
import { buildRecipeDocument } from "./recipeDocument";

/**
 * Keeps each user's recipe documents in DigitalOcean Spaces in sync with the
 * database, so the GenAI knowledge base can index them for the RAG assistant.
 *
 * These are called (fire-and-forget) from the recipe mutation routes after a
 * successful DB write — see docs/RAG_Recipe_Assistant_Implementation_Guide.md §5.
 * They re-read the canonical row so the document always matches what's stored,
 * regardless of how the row was created (create / update / copy / seed).
 *
 * Gated behind RAG_SYNC_ENABLED so nothing writes to Spaces until the knowledge
 * base is provisioned and we deliberately turn ingestion on.
 */

function ragSyncEnabled(): boolean {
  return process.env.RAG_SYNC_ENABLED === "true";
}

/**
 * (Re)builds and uploads a single recipe's RAG document. Reads the canonical
 * row via getRecipeById (ownership-scoped to userId). No-ops if disabled or if
 * the recipe can't be found.
 */
export async function syncRecipeToRag(
  userId: number,
  recipeId: number,
): Promise<void> {
  if (!ragSyncEnabled()) return;
  const recipe = await getRecipeById(userId, recipeId);
  if (!recipe) return;
  await putRecipeDocument(userId, recipeId, buildRecipeDocument(recipe));
}

/** Removes a recipe's RAG document (best-effort). No-ops if disabled. */
export async function removeRecipeFromRag(
  userId: number,
  recipeId: number,
): Promise<void> {
  if (!ragSyncEnabled()) return;
  await deleteRecipeDocument(userId, recipeId);
}

/**
 * Syncs several recipes for one user (used by copy/seed which create multiple
 * rows, and by the backfill script). Each recipe is independent — one failure
 * doesn't abort the rest.
 */
export async function syncRecipesToRag(
  userId: number,
  recipeIds: number[],
): Promise<void> {
  if (!ragSyncEnabled()) return;
  await Promise.all(
    recipeIds.map((recipeId) =>
      syncRecipeToRag(userId, recipeId).catch((error) =>
        console.error(`[rag] failed to sync recipe ${recipeId}`, error),
      ),
    ),
  );
}

/**
 * (Re)writes documents for ALL of a user's recipes in a single DB read. Used by
 * the backfill route (and, later, the nightly reconcile cron). Returns the
 * number of recipes written. No-ops (returns 0) if disabled.
 */
export async function syncAllRecipesForUser(userId: number): Promise<number> {
  if (!ragSyncEnabled()) return 0;
  const recipes = await getRecipes(userId);
  await Promise.all(
    recipes.map((r) =>
      putRecipeDocument(userId, r.recipe_id, buildRecipeDocument(r)).catch(
        (error) =>
          console.error(`[rag] failed to sync recipe ${r.recipe_id}`, error),
      ),
    ),
  );
  return recipes.length;
}

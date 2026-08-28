import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { executeQuery } from "@/lib/database/connection";
import { syncAllRecipesForUser } from "@/lib/rag/sync";

/**
 * One-shot backfill: (re)writes the RAG document for every recipe of every
 * active user into DigitalOcean Spaces, so the knowledge base has a full corpus
 * to index. Safe to re-run (idempotent — same keys overwritten).
 *
 * Protected by CRON_SECRET (Bearer or x-cron-secret header) rather than user
 * auth — it's an operator/ops action, not a user action. Requires
 * RAG_SYNC_ENABLED=true (syncAllRecipesForUser no-ops otherwise).
 *
 * See docs/RAG_Recipe_Assistant_Implementation_Guide.md §5.5.
 */

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization");
  const header = request.headers.get("x-cron-secret");
  return bearer === `Bearer ${secret}` || header === secret;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (process.env.RAG_SYNC_ENABLED !== "true") {
    return NextResponse.json(
      { error: "RAG_SYNC_ENABLED is not 'true' — nothing was written." },
      { status: 409 },
    );
  }

  try {
    // Every active user who owns at least one recipe.
    const rows = await executeQuery<RowDataPacket[]>(
      `SELECT DISTINCT r.user_id
       FROM ltc_recipes r
       JOIN ltc_users u ON u.user_id = r.user_id
       WHERE u.is_deleted = 0`,
    );

    let usersProcessed = 0;
    let recipesSynced = 0;
    for (const row of rows) {
      const count = await syncAllRecipesForUser(row.user_id);
      recipesSynced += count;
      usersProcessed += 1;
    }

    return NextResponse.json(
      { usersProcessed, recipesSynced },
      { status: 200 },
    );
  } catch (error) {
    console.error("[rag] backfill failed:", error);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
